/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'kibana/server';
import { omitBy, compact } from 'lodash';
import { inspect } from 'util';
import uuid from 'uuid';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { ESSearchRequest, ESSearchResponse } from '../../../../../typings/elasticsearch';
import { createReadySignal, ClusterClientAdapter } from '../../../event_log/server';
import { FieldMap, ILMPolicy } from './types';
import { RegisterRuleType, RuleState, RuleAlertState } from '../types';
import { mergeFieldMaps } from './field_map/merge_field_maps';
import {
  FieldMapType,
  runtimeTypeFromFieldMap,
  TypeOfFieldMap,
} from './field_map/runtime_type_from_fieldmap';
import { mappingFromFieldMap } from './field_map/mapping_from_field_map';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../alerting/server';
import { createCheckService } from './check_service';
import { AlertSeverityLevel, getAlertSeverityLevelValue } from '../../common';
import { DefaultFieldMap } from './defaults/field_map';

interface RuleRegistryOptions<TFieldMap extends FieldMap> {
  kibanaIndex: string;
  kibanaVersion: string;
  namespace: string;
  logger: Logger;
  core: CoreSetup;
  fieldMap: TFieldMap;
  ilmPolicy: ILMPolicy;
  alertingPluginSetupContract: AlertingPluginSetupContract;
  parent?: RuleRegistry<DefaultFieldMap>;
}

export class RuleRegistry<TFieldMap extends FieldMap> {
  private readonly esAdapter: ClusterClientAdapter<{
    body: TypeOfFieldMap<DefaultFieldMap>;
    index: string;
  }>;
  private readonly docRt: FieldMapType<DefaultFieldMap>;
  private readonly children: Array<RuleRegistry<DefaultFieldMap>> = [];

  constructor(private readonly options: RuleRegistryOptions<DefaultFieldMap>) {
    const { logger, core } = options;

    const { wait, signal } = createReadySignal<boolean>();

    this.esAdapter = new ClusterClientAdapter<{
      body: TypeOfFieldMap<DefaultFieldMap>;
      index: string;
    }>({
      wait,
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      logger: logger.get('esAdapter'),
    });

    this.docRt = runtimeTypeFromFieldMap(options.fieldMap);

    this.initialize()
      .then(() => {
        this.options.logger.debug('Bootstrapped alerts index');
        signal(true);
      })
      .catch((err) => {
        logger.error(inspect(err, { depth: null }));
        signal(false);
      });
  }

  private getEsNames() {
    const base = [this.options.kibanaIndex, this.options.namespace];
    const indexAliasName = [...base, this.options.kibanaVersion].join('-');
    const policyName = [...base, 'policy'].join('-');

    return {
      indexAliasName,
      policyName,
    };
  }

  private async initialize() {
    const { indexAliasName, policyName } = this.getEsNames();

    const ilmPolicyExists = await this.esAdapter.doesIlmPolicyExist(policyName);

    if (!ilmPolicyExists) {
      await this.esAdapter.createIlmPolicy(
        policyName,
        (this.options.ilmPolicy as unknown) as Record<string, unknown>
      );
    }

    const templateExists = await this.esAdapter.doesIndexTemplateExist(indexAliasName);

    if (!templateExists) {
      await this.esAdapter.createIndexTemplate(indexAliasName, {
        index_patterns: [`${indexAliasName}-*`],
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          'index.lifecycle.name': policyName,
          'index.lifecycle.rollover_alias': indexAliasName,
          'sort.field': '@timestamp',
          'sort.order': 'desc',
        },
        mappings: mappingFromFieldMap(this.options.fieldMap),
      });
    }

    const aliasExists = await this.esAdapter.doesAliasExist(indexAliasName);

    if (!aliasExists) {
      await this.esAdapter.createIndex(`${indexAliasName}-000001`, {
        aliases: {
          [indexAliasName]: {
            is_write_index: true,
          },
        },
      });
    }
  }

  async search<TSearchRequest extends ESSearchRequest>(
    ruleIds: string[],
    request: TSearchRequest
  ): Promise<ESSearchResponse<unknown, TSearchRequest>> {
    const [{ elasticsearch }] = await this.options.core.getStartServices();

    const query = {
      bool: {
        filter: [
          {
            terms: {
              'rule.uuid': ruleIds,
            },
          },
          ...compact([request.body?.query]),
        ],
      },
    };

    const response = await elasticsearch.client.asInternalUser.search({
      ...request,
      body: {
        ...request.body,
        query,
      },
    });

    return (response.body as unknown) as ESSearchResponse<unknown, TSearchRequest>;
  }

  registerType: RegisterRuleType<DefaultFieldMap> = (type) => {
    this.options.alertingPluginSetupContract.registerType<
      Record<string, any>,
      RuleState,
      Record<string, any>,
      Record<string, any>,
      string,
      string
    >({
      ...type,
      executor: async (options) => {
        const {
          services,
          previousStartedAt,
          startedAt,
          state: maybePrevAlertState,
          alertId: ruleId,
          name: ruleName,
          params,
          // namespace,
        } = options;

        const prevAlertState =
          maybePrevAlertState && 'alerts' in maybePrevAlertState
            ? maybePrevAlertState
            : { alerts: {}, wrappedRuleState: maybePrevAlertState };

        const { alertInstanceFactory, ...passthroughServices } = services;

        const checkService = createCheckService({
          alertInstanceFactory: services.alertInstanceFactory as any,
          levels: [{ level: AlertSeverityLevel.warning, actionGroupId: type.defaultActionGroupId }],
        });

        const executorOptions = {
          previousStartedAt,
          startedAt,
          params,
          services: {
            ...passthroughServices,
            check: checkService.check as any,
          },
        };

        const ruleState = await type.executor(executorOptions);

        const activeAlerts = checkService.getAlerts();
        const previousAlertStates = prevAlertState.alerts;

        const previousAlertNames = Object.keys(previousAlertStates);
        const activeAlertNames = Object.keys(activeAlerts);

        const newAlertNames = activeAlertNames.filter(
          (alertName) => !previousAlertNames.includes(alertName)
        );

        const mergedAlertStates = {
          ...previousAlertStates,
          ...newAlertNames.reduce((prev, alertName) => {
            prev[alertName] = {
              alertId: uuid.v4(), // for log-type alerts, use alertName
              created: startedAt.getTime(),
            };
            return prev;
          }, {} as Record<string, RuleAlertState>),
        };

        // const idsOfLastAlertEventsToFetch = Object.values(mergedAlertStates).map(
        //   (state) => state.alertId
        // );

        // const start = new Date().getTime() - 60 * 60 * 1000;

        // const response = await this.search([ruleId], {
        //   body: {
        //     size: idsOfLastAlertEventsToFetch.length,
        //     query: {
        //       bool: {
        //         filter: [
        //           {
        //             terms: {
        //               'alert.id': idsOfLastAlertEventsToFetch,
        //             },
        //           },
        //           {
        //             range: {
        //               '@timestamp': {
        //                 gte: start,
        //                 format: 'epoch_millis',
        //               },
        //             },
        //           },
        //         ],
        //       },
        //     },
        //     collapse: {
        //       field: 'alert.id',
        //     },
        //     sort: {
        //       '@timestamp': 'desc',
        //     },
        //     _source: false,
        //     fields: Object.keys(this.options.fieldMap),
        //   },
        // });

        // const lastEventByAlertId = response.hits.hits.reduce((prev, hit) => {
        //   const alertId = hit.fields['alert.id']![0] as string;
        //   prev[alertId] = hit.fields as Record<string, unknown[]>;
        //   return prev;
        // }, {} as Record<string, Record<string, unknown[]>>);

        const index = this.getEsNames().indexAliasName;

        const updates = Object.entries(mergedAlertStates).map(([alertName, state]) => {
          const active = activeAlertNames.includes(alertName);

          const nextState = active ? activeAlerts[alertName] : undefined;

          const createdAt = new Date(state.created);

          const body: TypeOfFieldMap<DefaultFieldMap> = {
            ...(nextState
              ? {
                  ...nextState.fields,
                  'event.severity': getAlertSeverityLevelValue(nextState.level),
                  'alert.check.value': nextState.value,
                  'alert.check.threshold': nextState.threshold,
                  'event.action': 'active-alert',
                }
              : {
                  'event.end': startedAt.toISOString(),
                  'event.action': 'recovered-alert',
                }),
            'event.kind': 'alert',
            '@timestamp': startedAt.toISOString(),
            'rule.uuid': ruleId,
            'rule.id': type.id,
            'rule.category': type.name,
            'rule.name': ruleName,
            // 'rule.namespace': namespace,
            'rule_type.producer': type.producer,
            'alert.id': state.alertId,
            'event.start': createdAt.toISOString(),
            'event.duration': (startedAt.getTime() - createdAt.getTime()) * 1000,
            'alert.name': alertName,
            'alert.series_id': [ruleId, alertName].join('|'),
          };

          return {
            index,
            body,
          };
        });

        let indexedCount = 0;

        updates.forEach((update) => {
          const decode = this.docRt.decode(update.body);
          if (isLeft(decode)) {
            const error = new Error(`Failed to validate alert event`);
            error.stack += '\n' + PathReporter.report(decode).join('\n');
            this.options.logger.error(error);
          } else {
            this.esAdapter.indexDocument(update);
            indexedCount++;
          }
        });

        if (indexedCount > 0) {
          this.options.logger.debug(`Indexed ${indexedCount} events`);
        }

        const nextState = omitBy(mergedAlertStates, (_, alertName) => {
          return activeAlerts[alertName] === undefined;
        });

        return {
          wrappedRuleState: ruleState,
          alerts: nextState,
        };
      },
    });
  };

  create<TNextFieldMap extends FieldMap>({
    namespace,
    fieldMap,
    ilmPolicy,
  }: {
    namespace: string;
    fieldMap: TNextFieldMap;
    ilmPolicy?: ILMPolicy;
  }): RuleRegistry<TFieldMap & TNextFieldMap> {
    const mergedFieldMap = fieldMap
      ? mergeFieldMaps(this.options.fieldMap, fieldMap)
      : this.options.fieldMap;

    const child = new RuleRegistry<TFieldMap & TNextFieldMap>({
      ...this.options,
      logger: this.options.logger.get(namespace),
      namespace: [this.options.namespace, namespace].filter(Boolean).join('-'),
      fieldMap: mergedFieldMap,
      ...(ilmPolicy ? { ilmPolicy } : {}),
      parent: this,
    });

    this.children.push(child);

    return child;
  }
}

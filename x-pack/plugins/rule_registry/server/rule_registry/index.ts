/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'kibana/server';
import { mapValues, omitBy, compact } from 'lodash';
import { schema } from '@kbn/config-schema';
import { inspect } from 'util';
import uuid from 'uuid';
import { ESSearchRequest, ESSearchResponse } from '../../../../typings/elasticsearch';
import { createReadySignal } from '../../../event_log/server/lib/ready_signal';
import { ClusterClientAdapter } from '../../../event_log/server/es/cluster_client_adapter';
import { FieldMap, ILMPolicy } from './types';
import { RegisterRuleType, RuleState, RuleAlertState } from '../types';
import { mergeFieldMaps } from './field_map/merge_field_maps';
import { schemaFromFieldMap, SchemaOf } from './field_map/schema_from_field_map';
import { mappingFromFieldMap } from './field_map/mapping_from_field_map';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../alerting/server';
import { createCheckService } from './check_service';
import { AlertSeverityLevel } from '../../common';

interface RuleRegistryOptions<TFieldMap extends FieldMap> {
  kibanaIndex: string;
  kibanaVersion: string;
  namespace: string;
  logger: Logger;
  core: CoreSetup;
  fieldMap: TFieldMap;
  ilmPolicy: ILMPolicy;
  alertingPluginSetupContract: AlertingPluginSetupContract;
  parent?: RuleRegistry<FieldMap>;
}

export class RuleRegistry<TFieldMap extends FieldMap> {
  private readonly esAdapter: ClusterClientAdapter;
  private readonly docSchema: SchemaOf<TFieldMap>;
  private readonly children: Array<RuleRegistry<TFieldMap>> = [];

  constructor(private readonly options: RuleRegistryOptions<TFieldMap>) {
    const { logger, core } = options;

    const { wait, signal } = createReadySignal<boolean>();

    this.esAdapter = new ClusterClientAdapter({
      wait,
      elasticsearchClientPromise: core
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      logger,
    });

    this.docSchema = schemaFromFieldMap(options.fieldMap);

    this.initialize()
      .then(() => {
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
              'rule.id': ruleIds,
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

    return response.body as ESSearchResponse<unknown, TSearchRequest>;
  }

  registerType: RegisterRuleType<TFieldMap> = (type) => {
    this.options.alertingPluginSetupContract.registerType<
      Record<string, unknown>,
      RuleState,
      Record<string, unknown>,
      Record<string, unknown>,
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
          namespace,
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
          params: params as any,
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

        const common = {
          'event.kind': 'alert',
          '@timestamp': startedAt.toISOString(),
          'rule.id': ruleId,
          'rule.name': ruleName,
          'rule.namespace': namespace,
          'rule_type.id': type.id,
          'rule_type.name': type.name,
          'rule_type.producer': type.producer,
          // 'rule.interval.ms': prev
        };

        const idsOfLastAlertEventsToFetch = Object.values(mergedAlertStates).map(
          (state) => state.alertId
        );

        const start = new Date().getTime() - 60 * 60 * 1000;

        const response = await this.search([ruleId], {
          body: {
            size: idsOfLastAlertEventsToFetch.length,
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'alert.id': idsOfLastAlertEventsToFetch,
                    },
                  },
                  {
                    range: {
                      '@timestamp': {
                        gte: start,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ],
              },
            },
            collapse: {
              field: 'alert.id',
            },
            sort: {
              '@timestamp': 'desc',
            },
            _source: false,
            fields: Object.keys(this.options.fieldMap),
          },
        });

        const lastEventByAlertId = response.hits.hits.reduce((prev, hit) => {
          const alertId = hit.fields['alert.id']![0] as string;
          prev[alertId] = hit.fields as Record<string, unknown[]>;
          return prev;
        }, {} as Record<string, Record<string, unknown[]>>);

        const index = this.getEsNames().indexAliasName;

        const updates = Object.entries(mergedAlertStates).map(([alertName, state]) => {
          const active = activeAlertNames.includes(alertName);

          const lastEvent = lastEventByAlertId[state.alertId] ?? {};
          const nextState = active ? activeAlerts[alertName] : undefined;

          return {
            index,
            body: {
              ...lastEvent,
              ...(nextState
                ? {
                    ...nextState.fields,
                    'alert.check.severity': nextState.level,
                    'alert.check.value': nextState.value,
                    'alert.check.threshold': nextState.threshold,
                  }
                : {}),
              ...common,
              'alert.active': active,
              'alert.id': state.alertId,
              'alert.created': state.created,
              'alert.type': 'threshold', // or, log
              'alert.name': alertName,
              'alert.series_id': [ruleId, alertName].join('|'),
            },
          };
        });

        if (updates.length) {
          await this.esAdapter.indexDocuments(updates);
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

    const child = new RuleRegistry({
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

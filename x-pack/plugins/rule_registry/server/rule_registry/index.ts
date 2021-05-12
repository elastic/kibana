/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, RequestHandlerContext } from 'kibana/server';
import { inspect } from 'util';
import { AlertsClient } from '../../../alerting/server';
import { SpacesServiceStart } from '../../../spaces/server';
import {
  ActionVariable,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/common';
import { createReadySignal, ClusterClientAdapter } from '../../../event_log/server';
import { ILMPolicy } from './types';
import { RuleParams, RuleType } from '../types';
import {
  mergeFieldMaps,
  TypeOfFieldMap,
  FieldMap,
  FieldMapType,
  BaseRuleFieldMap,
  runtimeTypeFromFieldMap,
} from '../../common';
import { mappingFromFieldMap } from './field_map/mapping_from_field_map';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../alerting/server';
import { createScopedRuleRegistryClient } from './create_scoped_rule_registry_client';
import { ScopedRuleRegistryClient } from './create_scoped_rule_registry_client/types';

interface RuleRegistryOptions<TFieldMap extends FieldMap> {
  kibanaIndex: string;
  kibanaVersion: string;
  name: string;
  logger: Logger;
  coreSetup: CoreSetup;
  spacesStart?: SpacesServiceStart;
  fieldMap: TFieldMap;
  ilmPolicy: ILMPolicy;
  alertingPluginSetupContract: AlertingPluginSetupContract;
  writeEnabled: boolean;
}

export class RuleRegistry<TFieldMap extends BaseRuleFieldMap> {
  private readonly esAdapter: ClusterClientAdapter<{
    body: TypeOfFieldMap<TFieldMap>;
    index: string;
  }>;
  private readonly children: Array<RuleRegistry<TFieldMap>> = [];
  private readonly types: Array<RuleType<TFieldMap, any, any>> = [];

  private readonly fieldmapType: FieldMapType<TFieldMap>;

  constructor(private readonly options: RuleRegistryOptions<TFieldMap>) {
    const { logger, coreSetup } = options;

    this.fieldmapType = runtimeTypeFromFieldMap(options.fieldMap);

    const { wait, signal } = createReadySignal<boolean>();

    this.esAdapter = new ClusterClientAdapter<{
      body: TypeOfFieldMap<TFieldMap>;
      index: string;
    }>({
      wait,
      elasticsearchClientPromise: coreSetup
        .getStartServices()
        .then(([{ elasticsearch }]) => elasticsearch.client.asInternalUser),
      logger: logger.get('esAdapter'),
    });

    if (this.options.writeEnabled) {
      this.initialize()
        .then(() => {
          this.options.logger.debug('Bootstrapped alerts index');
          signal(true);
        })
        .catch((err) => {
          logger.error(inspect(err, { depth: null }));
          signal(false);
        });
    } else {
      logger.debug('Write disabled, indices are not being bootstrapped');
    }
  }

  private getEsNames() {
    const base = [this.options.kibanaIndex, this.options.name];
    const indexTarget = `${base.join('-')}*`;
    const indexAliasName = [...base, this.options.kibanaVersion.toLowerCase()].join('-');
    const policyName = [...base, 'policy'].join('-');

    return {
      indexAliasName,
      indexTarget,
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

    const mappings = mappingFromFieldMap(this.options.fieldMap);

    const esClient = (await this.options.coreSetup.getStartServices())[0].elasticsearch.client
      .asInternalUser;

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
        mappings,
      });
    } else {
      await esClient.indices.putTemplate({
        name: indexAliasName,
        body: {
          index_patterns: [`${indexAliasName}-*`],
          mappings,
        },
        create: false,
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
    } else {
      const { body: aliases } = (await esClient.indices.getAlias({
        index: indexAliasName,
      })) as { body: Record<string, { aliases: Record<string, { is_write_index: boolean }> }> };

      const writeIndex = Object.entries(aliases).find(
        ([indexName, alias]) => alias.aliases[indexAliasName]?.is_write_index === true
      )![0];

      const { body: fieldsInWriteIndex } = await esClient.fieldCaps({
        index: writeIndex,
        fields: '*',
      });

      const fieldsNotOrDifferentInIndex = Object.entries(this.options.fieldMap).filter(
        ([fieldName, descriptor]) => {
          return (
            !fieldsInWriteIndex.fields[fieldName] ||
            !fieldsInWriteIndex.fields[fieldName][descriptor.type]
          );
        }
      );

      if (fieldsNotOrDifferentInIndex.length > 0) {
        this.options.logger.debug(
          `Some fields were not found in write index mapping: ${Object.keys(
            Object.fromEntries(fieldsNotOrDifferentInIndex)
          ).join(',')}`
        );
        this.options.logger.info(`Updating index mapping due to new fields`);

        await esClient.indices.putMapping({
          index: indexAliasName,
          body: mappings,
        });
      }
    }
  }

  getFieldMapType() {
    return this.fieldmapType;
  }

  getRuleTypeById(ruleTypeId: string) {
    return this.types.find((type) => type.id === ruleTypeId);
  }

  getRegistryByRuleTypeId(ruleTypeId: string): RuleRegistry<TFieldMap> | undefined {
    if (this.getRuleTypeById(ruleTypeId)) {
      return this;
    }

    return this.children.find((child) => child.getRegistryByRuleTypeId(ruleTypeId));
  }

  async createScopedRuleRegistryClient({
    context,
    alertsClient,
  }: {
    context: RequestHandlerContext;
    alertsClient: AlertsClient;
  }): Promise<ScopedRuleRegistryClient<TFieldMap> | undefined> {
    if (!this.options.writeEnabled) {
      return undefined;
    }
    const { indexAliasName, indexTarget } = this.getEsNames();

    const frameworkAlerts = (
      await alertsClient.find({
        options: {
          perPage: 1000,
        },
      })
    ).data;

    return createScopedRuleRegistryClient({
      ruleUuids: frameworkAlerts.map((frameworkAlert) => frameworkAlert.id),
      scopedClusterClient: context.core.elasticsearch.client,
      clusterClientAdapter: this.esAdapter,
      registry: this,
      indexAliasName,
      indexTarget,
      logger: this.options.logger,
    });
  }

  registerType<TRuleParams extends RuleParams, TActionVariable extends ActionVariable>(
    type: RuleType<TFieldMap, TRuleParams, TActionVariable>
  ) {
    const logger = this.options.logger.get(type.id);

    const { indexAliasName, indexTarget } = this.getEsNames();

    this.types.push(type);

    this.options.alertingPluginSetupContract.registerType<
      AlertTypeParams,
      AlertTypeState,
      AlertInstanceState,
      { [key in TActionVariable['name']]: any },
      string
    >({
      ...type,
      executor: async (executorOptions) => {
        const { services, alertId, name, tags } = executorOptions;

        const rule = {
          id: type.id,
          uuid: alertId,
          category: type.name,
          name,
        };

        const producer = type.producer;

        return type.executor({
          ...executorOptions,
          rule,
          producer,
          services: {
            ...services,
            logger,
            ...(this.options.writeEnabled
              ? {
                  scopedRuleRegistryClient: createScopedRuleRegistryClient({
                    scopedClusterClient: services.scopedClusterClient,
                    ruleUuids: [rule.uuid],
                    clusterClientAdapter: this.esAdapter,
                    registry: this,
                    indexAliasName,
                    indexTarget,
                    ruleData: {
                      producer,
                      rule,
                      tags,
                    },
                    logger: this.options.logger,
                  }),
                }
              : {}),
          },
        });
      },
    });
  }

  create<TNextFieldMap extends FieldMap>({
    name,
    fieldMap,
    ilmPolicy,
  }: {
    name: string;
    fieldMap: TNextFieldMap;
    ilmPolicy?: ILMPolicy;
  }): RuleRegistry<TFieldMap & TNextFieldMap> {
    const mergedFieldMap = fieldMap
      ? mergeFieldMaps(this.options.fieldMap, fieldMap)
      : this.options.fieldMap;

    const child = new RuleRegistry({
      ...this.options,
      logger: this.options.logger.get(name),
      name: [this.options.name, name].filter(Boolean).join('-'),
      fieldMap: mergedFieldMap,
      ...(ilmPolicy ? { ilmPolicy } : {}),
    });

    this.children.push(child);

    // @ts-expect-error could be instantiated with a different subtype of constraint
    return child;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ClusterPutComponentTemplate } from '@elastic/elasticsearch/api/requestParams';
import { estypes } from '@elastic/elasticsearch';
import { ValidFeatureId } from '@kbn/rule-data-utils/target/alerts_as_data_rbac';

import { ElasticsearchClient, Logger } from 'kibana/server';
import { get, isEmpty } from 'lodash';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from '../../common/assets/lifecycle_policies/default_lifecycle_policy';
import { ClusterPutComponentTemplateBody, PutIndexTemplateRequest } from '../../common/types';
import { RuleDataClient } from '../rule_data_client';
import { RuleDataWriteDisabledError } from './errors';
import { incrementIndexName } from './utils';

const BOOTSTRAP_TIMEOUT = 60000;

export interface RuleDataPluginServiceConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  index: string;
}

function createSignal() {
  let resolver: () => void;

  let ready: boolean = false;

  const promise = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  function wait(): Promise<void> {
    return promise.then(() => {
      ready = true;
    });
  }

  function complete() {
    resolver();
  }

  return { wait, complete, isReady: () => ready };
}

export class RuleDataPluginService {
  signal = createSignal();

  constructor(private readonly options: RuleDataPluginServiceConstructorOptions) {}

  private assertWriteEnabled() {
    if (!this.isWriteEnabled()) {
      throw new RuleDataWriteDisabledError();
    }
  }

  private async getClusterClient() {
    return await this.options.getClusterClient();
  }

  async init() {
    if (!this.isWriteEnabled()) {
      this.options.logger.info('Write is disabled, not installing assets');
      this.signal.complete();
      return;
    }

    this.options.logger.info(`Installing assets in namespace ${this.getFullAssetName()}`);

    await this._createOrUpdateLifecyclePolicy({
      policy: this.getFullAssetName(DEFAULT_ILM_POLICY_ID),
      body: defaultLifecyclePolicy,
    });

    await this._createOrUpdateComponentTemplate({
      name: this.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
      body: technicalComponentTemplate,
    });

    await this._createOrUpdateComponentTemplate({
      name: this.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
      body: ecsComponentTemplate,
    });

    this.options.logger.info(`Installed all assets`);

    this.signal.complete();
  }

  private async _createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>
  ) {
    this.assertWriteEnabled();

    const clusterClient = await this.getClusterClient();
    this.options.logger.debug(`Installing component template ${template.name}`);
    return clusterClient.cluster.putComponentTemplate(template);
  }

  private async _createOrUpdateIndexTemplate(template: PutIndexTemplateRequest) {
    this.assertWriteEnabled();

    const clusterClient = await this.getClusterClient();
    this.options.logger.debug(`Installing index template ${template.name}`);
    const { body: simulateResponse } = await clusterClient.indices.simulateTemplate(template);
    const mappings: estypes.MappingTypeMapping = simulateResponse.template.mappings;

    if (isEmpty(mappings)) {
      throw new Error(
        'No mappings would be generated for this index, possibly due to failed/misconfigured bootstrapping'
      );
    }
    return clusterClient.indices.putIndexTemplate(template);
  }

  private async _createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    this.assertWriteEnabled();
    const clusterClient = await this.getClusterClient();

    this.options.logger.debug(`Installing lifecycle policy ${policy.policy}`);
    return clusterClient.ilm.putLifecycle(policy);
  }

  private async updateAliasWriteIndexMapping({ index, alias }: { index: string; alias: string }) {
    const clusterClient = await this.getClusterClient();

    const simulatedIndexMapping = await clusterClient.indices.simulateIndexTemplate({
      name: index,
    });
    const simulatedMapping = get(simulatedIndexMapping, ['body', 'template', 'mappings']);
    try {
      await clusterClient.indices.putMapping({
        index,
        body: simulatedMapping,
      });
      return;
    } catch (err) {
      if (err.meta?.body?.error?.type !== 'illegal_argument_exception') {
        this.options.logger.error(`Failed to PUT mapping for alias ${alias}: ${err.message}`);
        return;
      }
      const newIndexName = incrementIndexName(index);
      if (newIndexName == null) {
        this.options.logger.error(`Failed to increment write index name for alias: ${alias}`);
        return;
      }
      try {
        await clusterClient.indices.rollover({
          alias,
          new_index: newIndexName,
        });
      } catch (e) {
        if (e?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
          this.options.logger.error(`Failed to rollover index for alias ${alias}: ${e.message}`);
        }
      }
    }
  }

  async createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>
  ) {
    await this.wait();
    return this._createOrUpdateComponentTemplate(template);
  }

  async createOrUpdateIndexTemplate(template: PutIndexTemplateRequest) {
    await this.wait();
    return this._createOrUpdateIndexTemplate(template);
  }

  async createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    await this.wait();
    return this._createOrUpdateLifecyclePolicy(policy);
  }

  async updateIndexMappingsForAsset(assetName: string) {
    await this.wait();
    const clusterClient = await this.getClusterClient();
    const pattern = this.getFullAssetName(assetName);
    const { body: aliasesResponse } = await clusterClient.indices.getAlias({ index: pattern });
    const writeIndicesAndAliases: Array<{ index: string; alias: string }> = [];
    Object.entries(aliasesResponse).forEach(([index, aliases]) => {
      Object.entries(aliases.aliases).forEach(([aliasName, aliasProperties]) => {
        if (aliasProperties.is_write_index) {
          writeIndicesAndAliases.push({ index, alias: aliasName });
        }
      });
    });
    await Promise.all(
      writeIndicesAndAliases.map((indexAndAlias) =>
        this.updateAliasWriteIndexMapping(indexAndAlias)
      )
    );
  }

  isReady() {
    return this.signal.isReady();
  }

  wait() {
    return Promise.race([
      this.signal.wait(),
      new Promise((resolve, reject) => {
        setTimeout(reject, BOOTSTRAP_TIMEOUT);
      }),
    ]);
  }

  isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  getFullAssetName(assetName?: string) {
    return [this.options.index, assetName].filter(Boolean).join('-');
  }

  getRuleDataClient(
    feature: ValidFeatureId,
    assetName: string,
    initialize: () => Promise<void>,
    componentTemplateNames: string[],
    secondaryAlias?: string
  ) {
    return new RuleDataClient({
      alias: this.getFullAssetName(assetName),
      feature,
      getClusterClient: () => this.getClusterClient(),
      isWriteEnabled: this.isWriteEnabled(),
      ready: initialize,
      componentTemplateNames,
      secondaryAlias,
    });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ClusterPutComponentTemplate } from '@elastic/elasticsearch/api/requestParams';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from '../../common/assets/lifecycle_policies/default_lifecycle_policy';
import { ClusterPutComponentTemplateBody, PutIndexTemplateRequest } from '../../common/types';

const BOOTSTRAP_TIMEOUT = 60000;

interface RuleDataPluginServiceConstructorOptions {
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
    if (!this.isWriteEnabled) {
      throw new Error('Write operations are disabled');
    }
  }

  private async getClusterClient() {
    return await this.options.getClusterClient();
  }

  async init() {
    if (!this.isWriteEnabled) {
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
    return clusterClient.indices.putIndexTemplate(template);
  }

  private async _createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    this.assertWriteEnabled();
    const clusterClient = await this.getClusterClient();

    this.options.logger.debug(`Installing lifecycle policy ${policy.policy}`);
    return clusterClient.ilm.putLifecycle(policy);
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
}

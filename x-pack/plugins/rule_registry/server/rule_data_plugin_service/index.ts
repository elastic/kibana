/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ClusterPutComponentTemplate } from '@elastic/elasticsearch/api/requestParams';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { DEFAULT_ASSET_NAMESPACE } from '../../common/assets';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from '../../common/assets/lifecycle_policies/default_lifecycle_policy';
import { ClusterPutComponentTemplateBody } from '../../common/types';

interface RuleDataPluginServiceConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  kibanaIndex: string;
}

export class RuleDataPluginService {
  constructor(private readonly options: RuleDataPluginServiceConstructorOptions) {}

  async init() {
    this.options.logger.info(`Installing assets in namespace ${this.getFullAssetName()}`);

    await this.createOrUpdateLifecyclePolicy({
      policy: this.getFullAssetName(DEFAULT_ILM_POLICY_ID),
      body: defaultLifecyclePolicy,
    });

    await this.createOrUpdateComponentTemplate({
      name: this.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
      body: technicalComponentTemplate,
    });

    await this.createOrUpdateComponentTemplate({
      name: this.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
      body: ecsComponentTemplate,
    });

    this.options.logger.info(`Installed all assets`);
  }

  async createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>
  ) {
    this.options.logger.debug(`Installing component template ${template.name}`);
    const clusterClient = await this.options.getClusterClient();
    return clusterClient.cluster.putComponentTemplate(template);
  }

  async createOrUpdateIndexTemplate(
    template: estypes.PutIndexTemplateRequest & { body?: { composed_of?: string[] } }
  ) {
    this.options.logger.debug(`Installing index template ${template.name}`);
    const clusterClient = await this.options.getClusterClient();
    return clusterClient.indices.putIndexTemplate(template);
  }

  async createOrUpdateLifecyclePolicy(policy: estypes.PutLifecycleRequest) {
    this.options.logger.debug(`Installing lifecycle policy ${policy.policy}`);
    const clusterClient = await this.options.getClusterClient();
    return clusterClient.ilm.putLifecycle(policy);
  }

  isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  getFullAssetName(assetName?: string) {
    return [this.options.kibanaIndex, DEFAULT_ASSET_NAMESPACE, assetName].filter(Boolean).join('-');
  }
}

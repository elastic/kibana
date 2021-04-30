/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplate } from '@elastic/elasticsearch/api/requestParams';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { ClusterPutComponentTemplateBody } from './types';
import { DEFAULT_ASSET_NAMESPACE } from '../../common/assets';

interface RuleDataPluginServiceConstructorOptions {
  ready: () => Promise<{ clusterClient: ElasticsearchClient }>;
  logger: Logger;
  isWriteEnabled: boolean;
  kibanaIndex: string;
}

export class RuleDataPluginService {
  constructor(private readonly options: RuleDataPluginServiceConstructorOptions) {}

  private async getClusterClient() {
    const { clusterClient } = await this.options.ready();

    return clusterClient;
  }

  async createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>
  ) {
    const clusterClient = await this.getClusterClient();
    return clusterClient.cluster.putComponentTemplate(template);
  }

  async createOrUpdateIndexTemplate(template: estypes.PutIndexTemplateRequest) {
    const clusterClient = await this.getClusterClient();
    return clusterClient.indices.putIndexTemplate(template);
  }

  async createOrUpdateLifecyclePolicy(policy: estypes.PutLifecycleRequest) {
    const clusterClient = await this.getClusterClient();
    return clusterClient.ilm.putLifecycle(policy);
  }

  isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  getFullAssetName(assetName?: string) {
    return [this.options.kibanaIndex, DEFAULT_ASSET_NAMESPACE, assetName].filter(Boolean).join('-');
  }
}

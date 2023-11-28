/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { createOrUpdateIndex } from '../utils/create_index';
import { getAssetCriticalityIndex } from '../../../../common/asset_criticality';
import { assetCriticalityFieldMap } from './configurations';

interface AssetCriticalityClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

export class AssetCriticalityDataClient {
  constructor(private readonly options: AssetCriticalityClientOpts) {}
  /**
   * It will create idex for asset criticality,
   * or update mappings if index exists
   */
  public async init() {
    await createOrUpdateIndex({
      esClient: this.options.esClient,
      logger: this.options.logger,
      options: {
        index: getAssetCriticalityIndex(this.options.namespace),
        mappings: mappingFromFieldMap(assetCriticalityFieldMap, 'strict'),
      },
    });
  }

  public async doesIndexExist() {
    try {
      const result = await this.options.esClient.indices.exists({
        index: getAssetCriticalityIndex(this.options.namespace),
      });
      return result;
    } catch (e) {
      return false;
    }
  }

  public async getStatus() {
    const isAssetCriticalityResourcesInstalled = await this.doesIndexExist();

    return {
      isAssetCriticalityResourcesInstalled,
    };
  }
}

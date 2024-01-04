/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics/asset_criticality';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { getAssetCriticalityIndex } from '../../../../common/entity_analytics/asset_criticality';
import { assetCriticalityFieldMap } from './configurations';

interface AssetCriticalityClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

interface AssetCriticalityUpsert {
  idField: AssetCriticalityRecord['id_field'];
  idValue: AssetCriticalityRecord['id_value'];
  criticalityLevel: AssetCriticalityRecord['criticality_level'];
}

type AssetCriticalityIdParts = Pick<AssetCriticalityUpsert, 'idField' | 'idValue'>;

const createId = ({ idField, idValue }: AssetCriticalityIdParts) => `${idField}:${idValue}`;
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
        index: this.getIndex(),
        mappings: mappingFromFieldMap(assetCriticalityFieldMap, 'strict'),
      },
    });
  }

  private getIndex() {
    return getAssetCriticalityIndex(this.options.namespace);
  }

  public async doesIndexExist() {
    try {
      const result = await this.options.esClient.indices.exists({
        index: this.getIndex(),
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

  public async get(idParts: AssetCriticalityIdParts): Promise<AssetCriticalityRecord | undefined> {
    const id = createId(idParts);

    try {
      const body = await this.options.esClient.get<AssetCriticalityRecord>({
        id,
        index: this.getIndex(),
      });

      return body._source;
    } catch (err) {
      if (err.statusCode === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  public async upsert(record: AssetCriticalityUpsert): Promise<AssetCriticalityRecord> {
    const id = createId(record);
    const doc = {
      id_field: record.idField,
      id_value: record.idValue,
      criticality_level: record.criticalityLevel,
      '@timestamp': new Date().toISOString(),
    };

    await this.options.esClient.update({
      id,
      index: this.getIndex(),
      body: {
        doc,
        doc_as_upsert: true,
      },
    });

    return doc;
  }

  public async delete(idParts: AssetCriticalityIdParts) {
    await this.options.esClient.delete({
      id: createId(idParts),
      index: this.getIndex(),
    });
  }
}

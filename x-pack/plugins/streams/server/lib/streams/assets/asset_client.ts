/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pLimit from 'p-limit';
import { StorageClient } from '@kbn/observability-utils-server/es/storage';
import { termQuery } from '@kbn/observability-utils-server/es/queries/term_query';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { keyBy } from 'lodash';
import objectHash from 'object-hash';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { AssetStorageSettings } from './storage_settings';
import {
  ASSET_TYPES,
  Asset,
  AssetType,
  AssetTypeToAssetMap,
  Dashboard,
  Slo,
} from '../../../../common/assets';
import { ASSET_ENTITY_ID, ASSET_ENTITY_TYPE } from './fields';

function sloSavedObjectToAsset(
  sloId: string,
  savedObject: SavedObject<{ name: string; tags: string[] }>
): Slo {
  return {
    assetId: sloId,
    label: savedObject.attributes.name,
    tags: savedObject.attributes.tags.concat(
      savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id)
    ),
    type: 'slo',
  };
}

function dashboardSavedObjectToAsset(
  dashboardId: string,
  savedObject: SavedObject<{ title: string }>
): Dashboard {
  return {
    assetId: dashboardId,
    label: savedObject.attributes.title,
    tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
    type: 'dashboard',
  };
}

function ruleToAsset(ruleId: string, rule: SanitizedRule): Asset {
  return {
    type: 'rule',
    assetId: ruleId,
    label: rule.name,
    tags: rule.tags,
  };
}

export class AssetClient {
  constructor(
    private readonly clients: {
      storageClient: StorageClient<AssetStorageSettings>;
      soClient: SavedObjectsClientContract;
      rulesClient: RulesClient;
    }
  ) {}

  async linkAsset({
    entityId,
    entityType,
    assetId,
    assetType,
  }: {
    entityId: string;
    entityType: string;
    assetId: string;
    assetType: AssetType;
  }) {
    const assetDoc = {
      'asset.id': assetId,
      'asset.type': assetType,
      'entity.id': entityId,
      'entity.type': entityType,
    };

    const id = objectHash(assetDoc);

    await this.clients.storageClient.index({
      id,
      document: assetDoc,
    });
  }

  async unlinkAsset({
    entityId,
    entityType,
    assetId,
    assetType,
  }: {
    entityId: string;
    entityType: string;
    assetId: string;
    assetType: string;
  }) {
    const id = objectHash({
      'asset.id': assetId,
      'asset.type': assetType,
      'entity.id': entityId,
      'entity.type': entityType,
    });

    await this.clients.storageClient.delete(id);
  }

  async getAssets({
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: 'stream';
  }): Promise<Asset[]> {
    const assetsResponse = await this.clients.storageClient.search('get_assets_for_entity', {
      size: 10_000,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(ASSET_ENTITY_ID, entityId),
            ...termQuery(ASSET_ENTITY_TYPE, entityType),
          ],
        },
      },
    });

    const assetLinks = assetsResponse.hits.hits.map((hit) => hit._source);

    if (!assetLinks.length) {
      return [];
    }

    const idsByType = Object.fromEntries(
      Object.values(ASSET_TYPES).map((type) => [type, [] as string[]])
    ) as Record<AssetType, string[]>;

    assetLinks.forEach((assetLink) => {
      const assetType = assetLink['asset.type'];
      const assetId = assetLink['asset.id'];
      idsByType[assetType].push(assetId);
    });

    const limiter = pLimit(10);

    const [dashboards, rules, slos] = await Promise.all([
      idsByType.dashboard.length
        ? this.clients.soClient
            .bulkGet<{ title: string }>(
              idsByType.dashboard.map((dashboardId) => ({ type: 'dashboard', id: dashboardId }))
            )
            .then((response) => {
              const dashboardsById = keyBy(response.saved_objects, 'id');

              return idsByType.dashboard.flatMap((dashboardId): Asset[] => {
                const dashboard = dashboardsById[dashboardId];
                if (dashboard) {
                  return [dashboardSavedObjectToAsset(dashboardId, dashboard)];
                }
                return [];
              });
            })
        : [],
      Promise.all(
        idsByType.rule.map((ruleId) => {
          return limiter(() =>
            this.clients.rulesClient.get({ id: ruleId }).then((rule): Asset => {
              return ruleToAsset(ruleId, rule);
            })
          );
        })
      ),
      idsByType.slo.length
        ? this.clients.soClient
            .find<{ name: string; tags: string[] }>({
              type: 'slo',
              filter: `slo.attributes.id:(${idsByType.slo
                .map((sloId) => `"${sloId}"`)
                .join(' OR ')})`,
              perPage: idsByType.slo.length,
            })
            .then((soResponse) => {
              const sloDefinitionsById = keyBy(soResponse.saved_objects, 'slo.attributes.id');

              return idsByType.slo.flatMap((sloId): Asset[] => {
                const sloDefinition = sloDefinitionsById[sloId];
                if (sloDefinition) {
                  return [sloSavedObjectToAsset(sloId, sloDefinition)];
                }
                return [];
              });
            })
        : [],
    ]);

    return [...dashboards, ...rules, ...slos];
  }

  async getSuggestions<T extends keyof AssetTypeToAssetMap>({
    entityId,
    entityType,
    query,
    assetType,
  }: {
    entityId: string;
    entityType: string;
    query: string;
    assetType: T;
  }): Promise<Array<{ asset: AssetTypeToAssetMap[T] }>> {
    if (assetType === 'dashboard') {
      const dashboardSavedObjects = await this.clients.soClient.find<{ title: string }>({
        type: 'dashboard',
        search: query,
      });

      return dashboardSavedObjects.saved_objects.map((dashboardSavedObject) => {
        return {
          asset: dashboardSavedObjectToAsset(dashboardSavedObject.id, dashboardSavedObject),
        };
      }) as Array<{ asset: AssetTypeToAssetMap[T] }>;
    }
    if (assetType === 'rule') {
      return [];
    }
    if (assetType === 'slo') {
      const sloSavedObjects = await this.clients.soClient.find<{ name: string; tags: string[] }>({
        type: 'slo',
        search: query,
      });

      return sloSavedObjects.saved_objects.map((sloSavedObject) => {
        return { asset: sloSavedObjectToAsset(sloSavedObject.id, sloSavedObject) };
      }) as Array<{ asset: AssetTypeToAssetMap[T] }>;
    }

    throw new Error(`Unsupported asset type: ${assetType}`);
  }
}

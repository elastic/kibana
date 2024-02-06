/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import _ from 'lodash';
import moment from 'moment';
import type { NewEntityStoreEntity } from '../../../../common/entity_analytics/entity_store/types';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityService } from '../asset_criticality';
import { AssetCriticalityDataClient } from '../asset_criticality';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import type { EntityStoreDataClient } from './entity_store_data_client';
import {
  FIELD_HISTORY_MAX_SIZE,
  COMPOSITES_INDEX_PATTERN,
  MAX_COMPOSITE_SIZE,
  MAX_CRITICALITY_SIZE,
} from './constants';
import type { LatestTaskStateSchema } from './tasks/state';

export interface UpdateEntityStoreParams {
  timestamps?: LatestTaskStateSchema['timestamps'];
  ids?: LatestTaskStateSchema['ids'];
}

export interface UpdateEntityStoreResponse {
  errors: string[];
  entitiesUpdated: number;
  entitiesCreated: number;
  timestamps: {
    lastProcessedCompositeTimestamp?: string;
    lastProcessedCriticalityTimestamp?: string;
  };
  ids: {
    lastProcessedCompositeId?: string;
    lastProcessedCriticalityId?: string;
  };
}

interface CompositeDocument {
  id: string;
  '@timestamp': string;
  type: 'host';
  host: {
    name: string;
  };
  ip_history: Array<{
    ip: string;
    timestamp: string;
  }>;
  first_doc_timestamp: string;
  last_doc_timestamp: string;
}

interface CompositeHit {
  '@timestamp': string;
  host: {
    name: string;
  };
  entity: {
    type: 'host';
    ip_history: Array<{
      ip: string;
      timestamp: string;
    }>;
    first_doc_timestamp: string;
    last_doc_timestamp: string;
  };
}

export const updateEntityStore = async ({
  spaceId,
  timestamps,
  esClient,
  logger,
  assetCriticalityService,
  riskEngineDataClient,
  entityStoreDataClient,
  riskScoreDataClient,
  ids,
}: UpdateEntityStoreParams & {
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  assetCriticalityService: AssetCriticalityService;
  entityStoreDataClient: EntityStoreDataClient;
  riskEngineDataClient: RiskEngineDataClient;
  riskScoreDataClient: RiskScoreDataClient;
}): Promise<UpdateEntityStoreResponse> => {
  const lastProcessedCompositeTimestamp =
    timestamps?.lastProcessedCompositeTimestamp || moment().subtract(1, 'day').toISOString();

  const lastProcessedCriticalityTimestamp =
    timestamps?.lastProcessedCriticalityTimestamp || moment().subtract(1, 'day').toISOString();

  const composites = await getNextEntityComposites({
    esClient,
    lastProcessedCompositeTimestamp,
    lastProcessedCompositeId: ids?.lastProcessedCompositeId,
  });

  const compositesByHostName = groupAndCombineCompositesByHostName(composites);

  logger.info(`Processing ${Object.keys(compositesByHostName).length} composites`);

  const newAssetCriticalities = await getNextAssetCriticalities({
    assetCriticalityService,
    fromTimestamp: lastProcessedCriticalityTimestamp,
    lastProcessedId: ids?.lastProcessedCriticalityId,
  });

  const assetCriticalitiesById = _.keyBy(newAssetCriticalities, (criticality) =>
    AssetCriticalityDataClient.createId({
      idField: criticality.id_field,
      idValue: criticality.id_value,
    })
  );

  const assetCriticalitiesToGet = Object.keys(compositesByHostName).filter(
    (hostName) =>
      !assetCriticalitiesById[
        AssetCriticalityDataClient.createId({ idField: 'host.name', idValue: hostName })
      ]
  );

  const entityAssetCriticalities = !assetCriticalitiesToGet.length
    ? []
    : await assetCriticalityService.getCriticalitiesByIdentifiers(
        assetCriticalitiesToGet.map((hostName) => ({
          id_field: 'host.name',
          id_value: hostName,
        }))
      );

  entityAssetCriticalities.forEach((criticality) => {
    assetCriticalitiesById[
      AssetCriticalityDataClient.createId({
        idField: criticality.id_field,
        idValue: criticality.id_value,
      })
    ] = criticality;
  });

  const compositeEntities: NewEntityStoreEntity[] = Object.entries(compositesByHostName).map(
    ([hostName, composite]) => {
      const criticalityId = AssetCriticalityDataClient.createId({
        idField: 'host.name',
        idValue: hostName,
      });
      const assetCriticality = assetCriticalitiesById[criticalityId];

      if (assetCriticality) {
        logger.info(`Found asset criticality for host ${hostName}`);
        delete assetCriticalitiesById[criticalityId];
      }

      return buildEntityFromComposite(composite, assetCriticality);
    }
  );

  const remainingriticalityEntities = Object.values(assetCriticalitiesById).map((criticality) => {
    logger.info(`Found asset criticality for host ${criticality.id_value}`);
    return buildEntityFromCriticalityRecord(criticality);
  });

  const entities = [...compositeEntities, ...remainingriticalityEntities];

  const { errors, created, updated } = await entityStoreDataClient.bulkUpsertEntities({
    entities,
  });

  const { ids: newIds, timestamps: newTimestamps } = createLastProcessedInfo({
    composites,
    assetCriticalities: newAssetCriticalities,
    ...timestamps,
    ...ids,
  });

  return {
    errors,
    entitiesUpdated: updated,
    entitiesCreated: created,
    ids: newIds,
    timestamps: newTimestamps,
  };
};

function createLastProcessedInfo(opts: {
  composites: CompositeDocument[];
  assetCriticalities: AssetCriticalityRecord[];
  lastProcessedCompositeTimestamp?: string;
  lastProcessedCriticalityTimestamp?: string;
  lastProcessedCompositeId?: string;
  lastProcessedCriticalityId?: string;
}): {
  ids: UpdateEntityStoreResponse['ids'];
  timestamps: UpdateEntityStoreResponse['timestamps'];
} {
  const {
    composites,
    assetCriticalities,
    lastProcessedCriticalityTimestamp,
    lastProcessedCompositeTimestamp,
    lastProcessedCompositeId,
    lastProcessedCriticalityId,
  } = opts;

  const lastProcessedComposite = composites.at(-1);
  const lastProcessedCriticality = assetCriticalities.at(-1);

  return {
    ids: {
      lastProcessedCompositeId: lastProcessedComposite?.id || lastProcessedCompositeId,
      lastProcessedCriticalityId: lastProcessedCriticality
        ? AssetCriticalityDataClient.createIdFromRecord(lastProcessedCriticality)
        : lastProcessedCriticalityId,
    },
    timestamps: {
      lastProcessedCompositeTimestamp:
        lastProcessedComposite?.['@timestamp'] || lastProcessedCompositeTimestamp,
      lastProcessedCriticalityTimestamp:
        lastProcessedCriticality?.['@timestamp'] || lastProcessedCriticalityTimestamp,
    },
  };
}

async function getNextEntityComposites({
  esClient,
  lastProcessedCompositeTimestamp,
  lastProcessedCompositeId,
}: {
  esClient: ElasticsearchClient;
  lastProcessedCompositeTimestamp?: string;
  lastProcessedCompositeId?: string;
}): Promise<CompositeDocument[]> {
  const result = await esClient.search<CompositeHit>({
    index: COMPOSITES_INDEX_PATTERN,
    size: MAX_COMPOSITE_SIZE,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: lastProcessedCompositeTimestamp,
                },
              },
            },
          ],
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'asc',
          },
        },
      ],
    },
  });

  let hits = result.hits.hits;

  // get all hits after _id lastProcessedCompositeId
  if (lastProcessedCompositeId) {
    const lastProcessedCompositeIndex = hits.findIndex(
      (hit) => hit._id === lastProcessedCompositeId
    );
    if (lastProcessedCompositeIndex !== -1) {
      hits = hits.slice(lastProcessedCompositeIndex + 1);
    }
  }

  return hits
    .filter((hit) => hit._source)
    .map((hit) => {
      const src = hit._source as CompositeHit;
      return {
        id: hit._id,
        '@timestamp': src['@timestamp'],
        type: src.entity.type,
        host: src.host,
        ip_history: src.entity.ip_history,
        first_doc_timestamp: src.entity.first_doc_timestamp,
        last_doc_timestamp: src.entity.last_doc_timestamp,
      };
    });
}

async function getNextAssetCriticalities({
  assetCriticalityService,
  fromTimestamp,
  lastProcessedId,
}: {
  assetCriticalityService: AssetCriticalityService;
  fromTimestamp?: string;
  lastProcessedId?: string;
}): Promise<AssetCriticalityRecord[]> {
  if (!fromTimestamp) {
    return [];
  }
  const criticalities = await assetCriticalityService.getCriticalitiesFromTimestamp(
    fromTimestamp,
    MAX_CRITICALITY_SIZE
  );

  if (!lastProcessedId || !criticalities.length) {
    return criticalities;
  }

  const lastProcessedIndex = criticalities.findIndex((criticality) => {
    return (
      AssetCriticalityDataClient.createIdFromRecord(criticality) === lastProcessedId &&
      criticality['@timestamp'] === fromTimestamp
    );
  });

  if (lastProcessedIndex === -1) {
    return criticalities;
  }

  return criticalities.slice(lastProcessedIndex + 1);
}

function groupAndCombineCompositesByHostName(
  composites: CompositeDocument[]
): Record<string, CompositeDocument> {
  const compositesGroupedByHostName = _.groupBy(composites, (composite) => composite.host.name);

  const combinedCompositesByHostName = {} as Record<string, CompositeDocument>;

  Object.entries(compositesGroupedByHostName).forEach(([hostName, hostComposites]) => {
    const combinedCompositeDocument = hostComposites.reduce((combinedDoc, composite) => {
      const {
        ip_history: ipHistory,
        first_doc_timestamp: firstDocTimestamp,
        last_doc_timestamp: lastDocTimestamp,
        host,
      } = composite;

      if (!combinedDoc.host) {
        combinedDoc.host = host;
      }

      combinedDoc.ip_history = [...(combinedDoc.ip_history || []), ...ipHistory];

      if (!combinedDoc.first_doc_timestamp || firstDocTimestamp < combinedDoc.first_doc_timestamp) {
        combinedDoc.first_doc_timestamp = firstDocTimestamp;
      }

      if (!combinedDoc.last_doc_timestamp || lastDocTimestamp > combinedDoc.last_doc_timestamp) {
        combinedDoc.last_doc_timestamp = lastDocTimestamp;
      }

      return combinedDoc;
    }, {} as Partial<CompositeDocument>);

    if (!combinedCompositeDocument.ip_history) {
      return;
    }

    combinedCompositeDocument.ip_history = combinedCompositeDocument.ip_history.sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    combinedCompositeDocument.ip_history = combinedCompositeDocument.ip_history.slice(
      0,
      FIELD_HISTORY_MAX_SIZE
    );

    combinedCompositesByHostName[hostName] = combinedCompositeDocument as CompositeDocument;
  });

  return combinedCompositesByHostName;
}

function buildEntityFromComposite(
  composite: CompositeDocument,
  assetCriticalityRecord?: AssetCriticalityRecord
): NewEntityStoreEntity {
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    first_seen: composite.first_doc_timestamp,
    last_seen: composite.last_doc_timestamp,
    host: {
      ...composite.host,
      ip_history: composite.ip_history.map((ip) => ip),
      ...(assetCriticalityRecord
        ? { asset: { criticality: assetCriticalityRecord.criticality_level } }
        : {}),
    },
  };
}

function buildEntityFromCriticalityRecord(
  assetCriticalityRecord: AssetCriticalityRecord
): NewEntityStoreEntity {
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    host: {
      name: assetCriticalityRecord.id_value,
      asset: {
        criticality: assetCriticalityRecord.criticality_level,
      },
    },
  };
}

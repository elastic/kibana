/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import _ from 'lodash';
import moment from 'moment';
import type { EcsRiskScore } from '../../../../common/entity_analytics/risk_engine';
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
    lastProcessedRiskScoreTimestamp?: string;
  };
  ids: {
    lastProcessedCompositeId?: string;
    lastProcessedCriticalityId?: string;
    lastProcessedRiskScoreId?: {
      id_field: string;
      id_value: string;
    };
  };
}
interface OSInformation {
  Ext: {
    variant: string;
  };
  kernel: string;
  name: string;
  family: string;
  type: string;
  version: string;
  platform: string;
  full: string;
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
  latest_os_timestamp: string;
  latest_os: OSInformation;
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
    latest_os_timestamp: string;
    latest_os: OSInformation;
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

  const lastProcessedRiskScoreTimestamp =
    timestamps?.lastProcessedRiskScoreTimestamp || moment().subtract(1, 'day').toISOString();

  const composites = await getNextEntityComposites({
    esClient,
    lastProcessedCompositeTimestamp,
    lastProcessedCompositeId: ids?.lastProcessedCompositeId,
  });

  const compositesByHostName = groupAndCombineCompositesByHostName(composites);

  logger.info(`Processing ${Object.keys(compositesByHostName).length} composites`);

  const assetCriticalitiesById = await getNewAssetCriticalitiesAndEntityAssetCriticalities(
    Object.keys(compositesByHostName),
    assetCriticalityService,
    lastProcessedCriticalityTimestamp,
    ids?.lastProcessedCriticalityId
  );

  const riskScoresById = await getNewRiskScoresAndEntityRiskScores(
    Object.keys(compositesByHostName),
    riskScoreDataClient,
    lastProcessedRiskScoreTimestamp,
    ids?.lastProcessedRiskScoreId
  );

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

      const riskScoreId = createRiskScoreId({ id_field: 'host.name', id_value: hostName });
      const riskScore = riskScoresById[riskScoreId];
      if (riskScore) {
        logger.info(`Found risk score for host ${hostName}`);
        delete riskScoresById[riskScoreId];
      }

      return buildEntityFromComposite({ composite, assetCriticality, riskScore });
    }
  );

  const remainingCriticalityEntities = Object.values(assetCriticalitiesById).map((criticality) => {
    logger.info(`Found asset criticality for host ${criticality.id_value}`);
    return buildEntityFromCriticalityRecord(criticality);
  });

  const remainingRiskScoreEntities = Object.values(riskScoresById).map((riskScore) => {
    logger.info(`Found risk score for host ${riskScore.host?.name}`);
    return buildEntityFromHostRiskScore(riskScore);
  });

  const entities = [
    ...compositeEntities,
    ...remainingCriticalityEntities,
    ...remainingRiskScoreEntities,
  ];

  const { errors, created, updated } = await entityStoreDataClient.bulkUpsertEntities({
    entities,
  });

  const { ids: newIds, timestamps: newTimestamps } = createLastProcessedInfo({
    composites,
    assetCriticalities: Object.values(assetCriticalitiesById),
    riskScores: Object.values(riskScoresById),
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
  riskScores: EcsRiskScore[];
  lastProcessedCompositeTimestamp?: string;
  lastProcessedCriticalityTimestamp?: string;
  lastProcessedRiskScoreTimestamp?: string;
  lastProcessedCompositeId?: string;
  lastProcessedCriticalityId?: string;
  lastProcessedRiskScoreId?: {
    id_field: string;
    id_value: string;
  };
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
    lastProcessedRiskScoreId,
    lastProcessedRiskScoreTimestamp,
  } = opts;

  const lastProcessedComposite = composites
    .sort((a, b) => moment(a['@timestamp']).diff(moment(b['@timestamp'])))
    .at(-1);
  const lastProcessedCriticality = assetCriticalities
    .sort((a, b) => moment(a['@timestamp']).diff(moment(b['@timestamp'])))
    .at(-1);
  const lastProcessedRiskScore = opts.riskScores
    .sort((a, b) => moment(a['@timestamp']).diff(moment(b['@timestamp'])))
    .at(-1);

  return {
    ids: {
      lastProcessedCompositeId: lastProcessedComposite?.id || lastProcessedCompositeId,
      lastProcessedCriticalityId: lastProcessedCriticality
        ? AssetCriticalityDataClient.createIdFromRecord(lastProcessedCriticality)
        : lastProcessedCriticalityId,
      lastProcessedRiskScoreId: lastProcessedRiskScore?.host?.risk
        ? {
            id_field: lastProcessedRiskScore.host.risk.id_field,
            id_value: lastProcessedRiskScore.host.risk.id_value,
          }
        : lastProcessedRiskScoreId,
    },
    timestamps: {
      lastProcessedCompositeTimestamp:
        lastProcessedComposite?.['@timestamp'] || lastProcessedCompositeTimestamp,
      lastProcessedCriticalityTimestamp:
        lastProcessedCriticality?.['@timestamp'] || lastProcessedCriticalityTimestamp,
      lastProcessedRiskScoreTimestamp:
        lastProcessedRiskScore?.['@timestamp'] || lastProcessedRiskScoreTimestamp,
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
        latest_os_timestamp: src.entity.latest_os_timestamp,
        latest_os: src.entity.latest_os,
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

async function getNextRiskScores({
  riskScoreDataClient,
  fromTimestamp,
  lastProcessed,
}: {
  riskScoreDataClient: RiskScoreDataClient;
  fromTimestamp?: string;
  lastProcessed?: {
    id_field: string;
    id_value: string;
  };
}): Promise<EcsRiskScore[]> {
  if (!fromTimestamp) {
    return [];
  }

  let riskScores: EcsRiskScore[] = [];
  try {
    riskScores = await riskScoreDataClient.getRiskScoresFromTimestamp({
      from: fromTimestamp,
      size: MAX_CRITICALITY_SIZE,
      namespace: 'default',
    });
  } catch (e) {
    riskScores = [];
  }

  if (!lastProcessed || !riskScores.length) {
    return riskScores;
  }

  const lastProcessedIndex = riskScores.findIndex((riskScore) => {
    return (
      riskScore.host?.risk.id_value === lastProcessed.id_value &&
      riskScore.host?.risk.id_field === lastProcessed.id_field &&
      riskScore['@timestamp'] === fromTimestamp
    );
  });

  if (lastProcessedIndex === -1) {
    return riskScores;
  }

  return riskScores.slice(lastProcessedIndex + 1);
}

function compareTimestamps(a: string, b: string) {
  return moment(a).diff(moment(b));
}

function isTimestampBefore(a: string, b: string) {
  return compareTimestamps(a, b) < 0;
}

function isTimestampAfter(a: string, b: string) {
  return compareTimestamps(a, b) > 0;
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
        latest_os_timestamp: latestOsTimestamp,
        latest_os: latestOs,
      } = composite;

      if (!combinedDoc.host) {
        combinedDoc.host = host;
      }

      combinedDoc.ip_history = [...(combinedDoc.ip_history || []), ...ipHistory];

      if (
        !combinedDoc.first_doc_timestamp ||
        isTimestampBefore(firstDocTimestamp, combinedDoc.first_doc_timestamp)
      ) {
        combinedDoc.first_doc_timestamp = firstDocTimestamp;
      }

      if (
        !combinedDoc.last_doc_timestamp ||
        isTimestampAfter(lastDocTimestamp, combinedDoc.last_doc_timestamp)
      ) {
        combinedDoc.last_doc_timestamp = lastDocTimestamp;
      }

      if (
        !combinedDoc.latest_os_timestamp ||
        isTimestampAfter(latestOsTimestamp, combinedDoc.latest_os_timestamp)
      ) {
        combinedDoc.latest_os_timestamp = latestOsTimestamp;
        combinedDoc.latest_os = latestOs;
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

function buildEntityFromComposite(opts: {
  composite: CompositeDocument;
  assetCriticality?: AssetCriticalityRecord;
  riskScore?: EcsRiskScore;
}): NewEntityStoreEntity {
  const { composite, assetCriticality, riskScore } = opts;
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    first_seen: composite.first_doc_timestamp,
    last_seen: composite.last_doc_timestamp,
    host: {
      ...composite.host,
      ip_history: composite.ip_history.map((ip) => ip),
      ...(assetCriticality ? { asset: { criticality: assetCriticality.criticality_level } } : {}),
      ...(composite.latest_os_timestamp ? { os_seen_at: composite.latest_os_timestamp } : {}),
      ...(composite.latest_os ? { os: composite.latest_os } : {}),
      ...(riskScore?.host?.risk ? { risk: riskScore.host.risk } : {}),
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

function buildEntityFromHostRiskScore(riskScore: EcsRiskScore): NewEntityStoreEntity {
  if (!riskScore.host?.risk) {
    throw new Error('Risk score does not contain a host risk');
  }
  return {
    '@timestamp': new Date().toISOString(),
    entity_type: 'host',
    host: {
      name: riskScore.host?.name,
      risk: riskScore.host?.risk,
    },
  };
}

async function getNewAssetCriticalitiesAndEntityAssetCriticalities(
  hostNames: string[],
  assetCriticalityService: AssetCriticalityService,
  lastProcessedCriticalityTimestamp?: string,
  lastProcessedCriticalityId?: string
): Promise<Record<string, AssetCriticalityRecord>> {
  const newAssetCriticalities = await getNextAssetCriticalities({
    assetCriticalityService,
    fromTimestamp: lastProcessedCriticalityTimestamp,
    lastProcessedId: lastProcessedCriticalityId,
  });

  const assetCriticalitiesById = _.keyBy(newAssetCriticalities, (criticality) =>
    AssetCriticalityDataClient.createId({
      idField: criticality.id_field,
      idValue: criticality.id_value,
    })
  );

  const assetCriticalitiesToGet = hostNames.filter(
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

  return assetCriticalitiesById;
}

function createRiskScoreId({
  id_field: idField,
  id_value: idValue,
}: {
  id_field: string;
  id_value: string;
}): string {
  return `${idField}:${idValue}`;
}

async function getNewRiskScoresAndEntityRiskScores(
  hostNames: string[],
  riskScoreDataClient: RiskScoreDataClient,
  lastProcessedRiskScoreTimestamp?: string,
  lastProcessedRiskScoreId?: {
    id_field: string;
    id_value: string;
  }
): Promise<Record<string, EcsRiskScore>> {
  const newRiskScores = await getNextRiskScores({
    riskScoreDataClient,
    fromTimestamp: lastProcessedRiskScoreTimestamp,
    lastProcessed: lastProcessedRiskScoreId,
  });

  const hostRiskScores = newRiskScores.filter((riskScore) => riskScore.host?.risk);

  const riskScoresById = _.keyBy(
    hostRiskScores,
    (riskScore) => createRiskScoreId(riskScore.host!.risk) // eslint-disable-line @typescript-eslint/no-non-null-assertion
  );

  const riskScoresToGet = hostNames.filter(
    (hostName) => !riskScoresById[createRiskScoreId({ id_field: 'host.name', id_value: hostName })]
  );

  const entityRiskScores = !riskScoresToGet.length
    ? []
    : await riskScoreDataClient.getRiskScoresByIdentifiers(
        riskScoresToGet.map((hostName) => ({
          id_field: 'host.name',
          id_value: hostName,
        })),
        'default'
      );

  entityRiskScores.forEach((riskScore) => {
    riskScoresById[createRiskScoreId(riskScore.host!.risk)] = riskScore; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  });

  return riskScoresById;
}

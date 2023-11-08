/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getCloudDefendStatus } from '../../../routes/status/status';
import type { CloudDefendPluginStart, CloudDefendPluginStartDeps } from '../../../types';

import type { CloudDefendIndicesStats, IndexStats } from './types';
import {
  ALERTS_INDEX_PATTERN,
  FILE_INDEX_PATTERN,
  PROCESS_INDEX_PATTERN,
} from '../../../../common/constants';

const getIndexDocCount = (esClient: ElasticsearchClient, index: string) =>
  esClient.indices.stats({ index });

const getLatestDocTimestamp = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<string | null> => {
  const latestTimestamp = await esClient.search({
    index,
    query: {
      match_all: {},
    },
    sort: '@timestamp:desc',
    size: 1,
    fields: ['@timestamp'],
    _source: false,
  });

  const latestEventTimestamp = latestTimestamp.hits?.hits[0]?.fields;

  return latestEventTimestamp ? latestEventTimestamp['@timestamp'][0] : null;
};

const getIndexStats = async (
  esClient: ElasticsearchClient,
  index: string,
  logger: Logger
): Promise<IndexStats | {}> => {
  try {
    const lastDocTimestamp = await getLatestDocTimestamp(esClient, index);

    if (lastDocTimestamp) {
      const indexStats = await getIndexDocCount(esClient, index);
      return {
        doc_count: indexStats._all.primaries?.docs ? indexStats._all.primaries?.docs?.count : 0,
        deleted: indexStats._all.primaries?.docs?.deleted
          ? indexStats._all.primaries?.docs?.deleted
          : 0,
        size_in_bytes: indexStats._all.primaries?.store
          ? indexStats._all.primaries?.store.size_in_bytes
          : 0,
        last_doc_timestamp: lastDocTimestamp,
      };
    }

    return {};
  } catch (e) {
    logger.error(`Failed to get index stats for ${index}`);
    return {};
  }
};

export const getIndicesStats = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  coreServices: Promise<[CoreStart, CloudDefendPluginStartDeps, CloudDefendPluginStart]>,
  logger: Logger
): Promise<CloudDefendIndicesStats> => {
  const [alerts, file, process] = await Promise.all([
    getIndexStats(esClient, ALERTS_INDEX_PATTERN, logger),
    getIndexStats(esClient, FILE_INDEX_PATTERN, logger),
    getIndexStats(esClient, PROCESS_INDEX_PATTERN, logger),
  ]);

  const [, cloudDefendPluginStartDeps] = await coreServices;

  const { status, latestPackageVersion, installedPackagePolicies, healthyAgents } =
    await getCloudDefendStatus({
      logger,
      esClient,
      soClient,
      agentPolicyService: cloudDefendPluginStartDeps.fleet.agentPolicyService,
      agentService: cloudDefendPluginStartDeps.fleet.agentService,
      packagePolicyService: cloudDefendPluginStartDeps.fleet.packagePolicyService,
      packageService: cloudDefendPluginStartDeps.fleet.packageService,
    });

  return {
    alerts,
    file,
    process,
    latestPackageVersion,
    packageStatus: {
      status,
      installedPackagePolicies,
      healthyAgents,
    },
  };
};

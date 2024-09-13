/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getCspStatus } from '../../../routes/status/status';
import type { CspServerPluginStart, CspServerPluginStartDeps } from '../../../types';

import type { CspmIndicesStats, IndexStats } from './types';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  VULNERABILITIES_INDEX_DEFAULT_NS,
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
    const isIndexExists = await esClient.indices.exists({
      index,
    });

    if (isIndexExists) {
      const indexStats = await getIndexDocCount(esClient, index);
      return {
        doc_count: indexStats._all.primaries?.docs ? indexStats._all.primaries?.docs?.count : 0,
        deleted: indexStats._all.primaries?.docs?.deleted
          ? indexStats._all.primaries?.docs?.deleted
          : 0,
        size_in_bytes: indexStats._all.primaries?.store
          ? indexStats._all.primaries?.store.size_in_bytes
          : 0,
        last_doc_timestamp: await getLatestDocTimestamp(esClient, index),
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
  coreServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
): Promise<CspmIndicesStats> => {
  const [findings, latestFindings, vulMng, vulMngLatest, score] = await Promise.all([
    getIndexStats(esClient, FINDINGS_INDEX_DEFAULT_NS, logger),
    getIndexStats(esClient, LATEST_FINDINGS_INDEX_DEFAULT_NS, logger),
    getIndexStats(esClient, VULNERABILITIES_INDEX_DEFAULT_NS, logger),
    getIndexStats(esClient, CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN, logger),
    getIndexStats(esClient, BENCHMARK_SCORE_INDEX_DEFAULT_NS, logger),
  ]);

  const [, cspServerPluginStartDeps] = await coreServices;

  const cspContext = {
    logger,
    esClient,
    soClient,
    agentPolicyService: cspServerPluginStartDeps.fleet.agentPolicyService,
    agentService: cspServerPluginStartDeps.fleet.agentService,
    packagePolicyService: cspServerPluginStartDeps.fleet.packagePolicyService,
    packageService: cspServerPluginStartDeps.fleet.packageService,
    isPluginInitialized,
  };

  const status = await getCspStatus(cspContext);

  return {
    findings,
    latest_findings: latestFindings,
    vulnerabilities: vulMng,
    latest_vulnerabilities: vulMngLatest,
    score,

    latestPackageVersion: status.latestPackageVersion,
    cspm: status.cspm,
    kspm: status.kspm,
    vuln_mgmt: status.vuln_mgmt,
  };
};

const isPluginInitialized = (): boolean => {
  return true;
};

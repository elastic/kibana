/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { take } from 'rxjs/operators';
import { CollectorFetchContext, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Observable } from 'rxjs';
import { PluginsSetup } from '../plugin';
import { UsageStats, UsageStatsServiceSetup } from '../usage_stats';

interface SpacesAggregationResponse {
  hits: {
    total: { value: number };
  };
  aggregations: {
    [aggName: string]: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

/**
 *
 * @param {CallCluster} callCluster
 * @param {string} kibanaIndex
 * @param {PluginsSetup['features']} features
 * @param {boolean} spacesAvailable
 * @return {UsageData}
 */
async function getSpacesUsage(
  esClient: ElasticsearchClient,
  kibanaIndex: string,
  features: PluginsSetup['features'],
  spacesAvailable: boolean
) {
  if (!spacesAvailable) {
    return null;
  }

  const knownFeatureIds = features.getKibanaFeatures().map((feature) => feature.id);

  let resp: SpacesAggregationResponse | undefined;
  try {
    ({ body: resp } = await esClient.search({
      index: kibanaIndex,
      body: {
        track_total_hits: true,
        query: {
          term: {
            type: {
              value: 'space',
            },
          },
        },
        aggs: {
          disabledFeatures: {
            terms: {
              field: 'space.disabledFeatures',
              include: knownFeatureIds,
              size: knownFeatureIds.length,
            },
          },
        },
        size: 0,
      },
    }));
  } catch (err) {
    if (err.status === 404) {
      return null;
    }

    throw err;
  }

  const { hits, aggregations } = resp!;

  const count = hits?.total?.value ?? 0;
  const disabledFeatureBuckets = aggregations?.disabledFeatures?.buckets ?? [];

  const initialCounts = knownFeatureIds.reduce(
    (acc, featureId) => ({ ...acc, [featureId]: 0 }),
    {}
  );

  const disabledFeatures: Record<string, number> = disabledFeatureBuckets.reduce(
    // eslint-disable-next-line @typescript-eslint/naming-convention
    (acc, { key, doc_count }) => {
      return {
        ...acc,
        [key]: doc_count,
      };
    },
    initialCounts
  );

  const usesFeatureControls = Object.values(disabledFeatures).some(
    (disabledSpaceCount) => disabledSpaceCount > 0
  );

  return {
    count,
    usesFeatureControls,
    disabledFeatures,
  } as UsageData;
}

async function getUsageStats(
  usageStatsServicePromise: Promise<UsageStatsServiceSetup>,
  spacesAvailable: boolean
) {
  if (!spacesAvailable) {
    return null;
  }

  const usageStatsClient = await usageStatsServicePromise.then(({ getClient }) => getClient());
  return usageStatsClient.getUsageStats();
}

export interface UsageData extends UsageStats {
  available: boolean;
  enabled: boolean;
  count?: number;
  usesFeatureControls?: boolean;
  disabledFeatures: {
    // "feature": number;
    [key: string]: number | undefined;
    // Known registered features
    stackAlerts?: number;
    actions?: number;
    enterpriseSearch?: number;
    fleet?: number;
    savedObjectsTagging?: number;
    indexPatterns?: number;
    discover?: number;
    canvas?: number;
    maps?: number;
    siem?: number;
    monitoring?: number;
    graph?: number;
    uptime?: number;
    savedObjectsManagement?: number;
    timelion?: number;
    dev_tools?: number;
    advancedSettings?: number;
    infrastructure?: number;
    visualize?: number;
    logs?: number;
    dashboard?: number;
    ml?: number;
    apm?: number;
  };
}

interface CollectorDeps {
  kibanaIndexConfig$: Observable<{ kibana: { index: string } }>;
  features: PluginsSetup['features'];
  licensing: PluginsSetup['licensing'];
  usageStatsServicePromise: Promise<UsageStatsServiceSetup>;
}

/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(
  usageCollection: UsageCollectionSetup,
  deps: CollectorDeps
) {
  return usageCollection.makeUsageCollector<UsageData>({
    type: 'spaces',
    isReady: () => true,
    schema: {
      usesFeatureControls: { type: 'boolean' },
      disabledFeatures: {
        // "feature": number;
        DYNAMIC_KEY: { type: 'long' },
        // Known registered features
        stackAlerts: { type: 'long' },
        actions: { type: 'long' },
        enterpriseSearch: { type: 'long' },
        fleet: { type: 'long' },
        savedObjectsTagging: { type: 'long' },
        indexPatterns: { type: 'long' },
        discover: { type: 'long' },
        canvas: { type: 'long' },
        maps: { type: 'long' },
        siem: { type: 'long' },
        monitoring: { type: 'long' },
        graph: { type: 'long' },
        uptime: { type: 'long' },
        savedObjectsManagement: { type: 'long' },
        timelion: { type: 'long' },
        dev_tools: { type: 'long' },
        advancedSettings: { type: 'long' },
        infrastructure: { type: 'long' },
        visualize: { type: 'long' },
        logs: { type: 'long' },
        dashboard: { type: 'long' },
        ml: { type: 'long' },
        apm: { type: 'long' },
      },
      available: { type: 'boolean' },
      enabled: { type: 'boolean' },
      count: { type: 'long' },
      'apiCalls.copySavedObjects.total': { type: 'long' },
      'apiCalls.copySavedObjects.kibanaRequest.yes': { type: 'long' },
      'apiCalls.copySavedObjects.kibanaRequest.no': { type: 'long' },
      'apiCalls.copySavedObjects.createNewCopiesEnabled.yes': { type: 'long' },
      'apiCalls.copySavedObjects.createNewCopiesEnabled.no': { type: 'long' },
      'apiCalls.copySavedObjects.overwriteEnabled.yes': { type: 'long' },
      'apiCalls.copySavedObjects.overwriteEnabled.no': { type: 'long' },
      'apiCalls.resolveCopySavedObjectsErrors.total': { type: 'long' },
      'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.yes': { type: 'long' },
      'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.no': { type: 'long' },
      'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.yes': { type: 'long' },
      'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.no': { type: 'long' },
    },
    fetch: async ({ esClient }: CollectorFetchContext) => {
      const { licensing, kibanaIndexConfig$, features, usageStatsServicePromise } = deps;
      const license = await licensing.license$.pipe(take(1)).toPromise();
      const available = license.isAvailable; // some form of spaces is available for all valid licenses

      const kibanaIndex = (await kibanaIndexConfig$.pipe(take(1)).toPromise()).kibana.index;

      const usageData = await getSpacesUsage(esClient, kibanaIndex, features, available);
      const usageStats = await getUsageStats(usageStatsServicePromise, available);

      return {
        available,
        enabled: available,
        ...usageData,
        ...usageStats,
      } as UsageData;
    },
  });
}

export function registerSpacesUsageCollector(
  usageCollection: UsageCollectionSetup,
  deps: CollectorDeps
) {
  const collector = getSpacesUsageCollector(usageCollection, deps);
  usageCollection.registerCollector(collector);
}

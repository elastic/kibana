/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyCallAPIOptions } from 'src/core/server';
import { take } from 'rxjs/operators';
import { CollectorFetchContext, UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Observable } from 'rxjs';
import { KIBANA_STATS_TYPE_MONITORING } from '../../../monitoring/common/constants';
import { PluginsSetup } from '../plugin';
import { SpacesTelemetry } from '../model/spaces_telemetry';
import { TelemetryServiceSetup } from '../telemetry_service';

type CallCluster = <T = unknown>(
  endpoint: string,
  clientParams: Record<string, unknown>,
  options?: LegacyCallAPIOptions
) => Promise<T>;

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
 * @return {UsageStats}
 */
async function getSpacesUsage(
  callCluster: CallCluster,
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
    resp = await callCluster<SpacesAggregationResponse>('search', {
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
    });
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
  } as UsageStats;
}

async function getSpacesTelemetry(
  telemetryServicePromise: Promise<TelemetryServiceSetup>,
  spacesAvailable: boolean
) {
  if (!spacesAvailable) {
    return null;
  }

  const telemetryClient = await telemetryServicePromise.then(({ getClient }) => getClient());
  return telemetryClient.getTelemetryData();
}

export interface UsageStats extends SpacesTelemetry {
  available: boolean;
  enabled: boolean;
  count?: number;
  usesFeatureControls?: boolean;
  disabledFeatures: {
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
  telemetryServicePromise: Promise<TelemetryServiceSetup>;
}

interface BulkUpload {
  usage: {
    spaces: UsageStats;
  };
}
/*
 * @param {Object} server
 * @return {Object} kibana usage stats type collection object
 */
export function getSpacesUsageCollector(
  usageCollection: UsageCollectionSetup,
  deps: CollectorDeps
) {
  return usageCollection.makeUsageCollector<UsageStats, BulkUpload>({
    type: 'spaces',
    isReady: () => true,
    schema: {
      usesFeatureControls: { type: 'boolean' },
      disabledFeatures: {
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
      apiCalls: {
        copySavedObjects: {
          total: { type: 'long' },
          createNewCopies: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
          overwrite: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
        },
        resolveCopySavedObjectsErrors: {
          total: { type: 'long' },
          createNewCopies: {
            enabled: { type: 'long' },
            disabled: { type: 'long' },
          },
        },
      },
    },
    fetch: async ({ callCluster }: CollectorFetchContext) => {
      const { licensing, kibanaIndexConfig$, features, telemetryServicePromise } = deps;
      const license = await licensing.license$.pipe(take(1)).toPromise();
      const available = license.isAvailable; // some form of spaces is available for all valid licenses

      const kibanaIndex = (await kibanaIndexConfig$.pipe(take(1)).toPromise()).kibana.index;

      const usageStats = await getSpacesUsage(callCluster, kibanaIndex, features, available);
      const telemetryData = await getSpacesTelemetry(telemetryServicePromise, available);

      return {
        available,
        enabled: available,
        ...usageStats,
        ...telemetryData,
      } as UsageStats;
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage.xpack.spaces namespace of the data payload
     */
    formatForBulkUpload: (result: UsageStats) => {
      return {
        type: KIBANA_STATS_TYPE_MONITORING,
        payload: {
          usage: {
            spaces: result,
          },
        },
      };
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  CollectorFetchContext,
  UsageCollectionSetup,
} from '@kbn/usage-collection-plugin/server';

import type { PluginsSetup } from '../plugin';
import type { UsageStats, UsageStatsServiceSetup } from '../usage_stats';

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
 * @param {ElasticsearchClient} esClient
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
  const knownSolutions = ['classic', 'es', 'oblt', 'security', 'unset'];

  const resp = (await esClient.search({
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
        solution: {
          terms: {
            field: 'space.solution',
            size: knownSolutions.length,
            missing: 'unset',
          },
        },
      },
      size: 0,
    },
  })) as SpacesAggregationResponse;

  const { hits, aggregations } = resp;

  const count = hits?.total?.value ?? 0;
  const disabledFeatureBuckets = aggregations?.disabledFeatures?.buckets ?? [];
  const solutionBuckets = aggregations?.solution?.buckets ?? [];

  const initialCounts = knownFeatureIds.reduce<Record<string, number>>((acc, featureId) => {
    acc[featureId] = 0;
    return acc;
  }, {});

  const initialSolutionCounts = knownSolutions.reduce<Record<string, number>>((acc, solution) => {
    acc[solution] = 0;
    return acc;
  }, {});

  const disabledFeatures: Record<string, number> = disabledFeatureBuckets.reduce(
    // eslint-disable-next-line @typescript-eslint/naming-convention
    (acc, { key, doc_count }) => {
      acc[key] = doc_count;
      return acc;
    },
    initialCounts
  );

  const solutions = solutionBuckets.reduce<Record<string, number>>(
    // eslint-disable-next-line @typescript-eslint/naming-convention
    (acc, { key, doc_count }) => {
      acc[key] = doc_count;
      return acc;
    },
    initialSolutionCounts
  );

  const usesFeatureControls = Object.values(disabledFeatures).some(
    (disabledSpaceCount) => disabledSpaceCount > 0
  );

  return {
    count,
    usesFeatureControls,
    disabledFeatures,
    solutions,
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
  solutions: Record<string, number>;
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
  getIndexForType: (type: string) => Promise<string>;
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
      usesFeatureControls: {
        type: 'boolean',
        _meta: {
          description:
            'Indicates if at least one feature is disabled in at least one space. This is a signal that space-level feature controls are in use. This does not account for role-based (security) feature controls.',
        },
      },
      solutions: {
        classic: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have solution set to classic.',
          },
        },
        es: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have solution set to search.',
          },
        },
        oblt: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have solution set to observability.',
          },
        },
        security: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have solution set to security.',
          },
        },
        unset: {
          type: 'long',
          _meta: {
            description: 'The number of spaces without solution set.',
          },
        },
      },
      disabledFeatures: {
        // "feature": number;
        DYNAMIC_KEY: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        // Known registered features
        stackAlerts: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        actions: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        enterpriseSearch: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        fleet: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        savedObjectsTagging: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        indexPatterns: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        discover: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        canvas: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        maps: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        siem: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        monitoring: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        graph: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        uptime: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        savedObjectsManagement: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        dev_tools: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        advancedSettings: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        infrastructure: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        visualize: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        logs: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        dashboard: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        ml: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
        apm: {
          type: 'long',
          _meta: {
            description: 'The number of spaces which have this feature disabled.',
          },
        },
      },
      available: {
        type: 'boolean',
        _meta: {
          description: 'Indicates if the Spaces feature is available in this installation.',
        },
      },
      enabled: {
        type: 'boolean',
        _meta: {
          description: 'Indicates if the Spaces feature is enabled in this installation.',
        },
      },
      count: {
        type: 'long',
        _meta: {
          description: 'The number of spaces in this installation.',
        },
      },
      'apiCalls.copySavedObjects.total': {
        type: 'long',
        _meta: {
          description: 'The number of times the "Copy Saved Objects" API has been called.',
        },
      },
      'apiCalls.copySavedObjects.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called via the Kibana client.',
        },
      },
      'apiCalls.copySavedObjects.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called via an API consumer (e.g. curl).',
        },
      },
      'apiCalls.copySavedObjects.createNewCopiesEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called with "createNewCopies" set to true.',
        },
      },
      'apiCalls.copySavedObjects.createNewCopiesEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called with "createNewCopies" set to false.',
        },
      },
      'apiCalls.copySavedObjects.overwriteEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called with "overwrite" set to true.',
        },
      },
      'apiCalls.copySavedObjects.overwriteEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called with "overwrite" set to false.',
        },
      },
      'apiCalls.copySavedObjects.compatibilityModeEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called with "compatibilityMode" set to true.',
        },
      },
      'apiCalls.copySavedObjects.compatibilityModeEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Copy Saved Objects" API has been called with "compatibilityMode" set to false.',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.total': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called.',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called via the Kibana client.',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.kibanaRequest.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called via an API consumer (e.g. curl).',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called with "createNewCopies" set to true.',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.createNewCopiesEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called with "createNewCopies" set to false.',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.compatibilityModeEnabled.yes': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called with "compatibilityMode" set to true.',
        },
      },
      'apiCalls.resolveCopySavedObjectsErrors.compatibilityModeEnabled.no': {
        type: 'long',
        _meta: {
          description:
            'The number of times the "Resolve Copy Saved Objects Errors" API has been called with "compatibilityMode" set to false.',
        },
      },
      'apiCalls.disableLegacyUrlAliases.total': {
        type: 'long',
        _meta: {
          description: 'The number of times the "Disable Legacy URL Aliases" API has been called.',
        },
      },
    },
    fetch: async ({ esClient }: CollectorFetchContext) => {
      const { licensing, getIndexForType, features, usageStatsServicePromise } = deps;
      const license = await firstValueFrom(licensing.license$);
      const available = license.isAvailable; // some form of spaces is available for all valid licenses

      const spaceIndex = await getIndexForType('space');
      const usageData = await getSpacesUsage(esClient, spaceIndex, features, available);
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

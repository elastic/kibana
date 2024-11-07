/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationContext } from '@kbn/core-feature-flags-server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { LDClient, LDMultiKindContext } from '@launchdarkly/node-server-sdk';

export interface Usage {
  initialized: boolean;
  flags: Record<string, unknown>;
  flagNames: string[];
}

export type LaunchDarklyEntitiesGetter = () => {
  launchDarklyClient?: LDClient;
  currentContext: EvaluationContext;
};

export function registerUsageCollector(
  usageCollection: UsageCollectionSetup,
  getLaunchDarklyEntities: LaunchDarklyEntitiesGetter
) {
  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<Usage>({
      type: 'cloudExperiments',
      isReady: () => true,
      schema: {
        initialized: {
          type: 'boolean',
          _meta: {
            description:
              'Whether the A/B testing client is correctly initialized (identify has been called)',
          },
        },
        // We'll likely map "flags" as `flattened`, so "flagNames" helps out to discover the key names
        flags: {
          type: 'pass_through',
          _meta: { description: 'Flags received by the client' },
        },
        flagNames: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description: 'Names of the flags received by the client',
            },
          },
        },
      },
      fetch: async () => {
        const { launchDarklyClient, currentContext } = getLaunchDarklyEntities();
        if (!launchDarklyClient) return { initialized: false, flagNames: [], flags: {} };
        return await getAllFlags(launchDarklyClient, currentContext);
      },
    })
  );
}

async function getAllFlags(
  launchDarklyClient: LDClient,
  currentContext: EvaluationContext
): Promise<Usage> {
  const flagsState = await launchDarklyClient.allFlagsState(currentContext as LDMultiKindContext);
  const flags = flagsState.allValues();
  return {
    initialized: flagsState.valid,
    flags,
    flagNames: Object.keys(flags),
  };
}

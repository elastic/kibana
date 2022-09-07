/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LDClient, LDUser } from 'launchdarkly-node-server-sdk';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

interface Usage {
  initialized: boolean;
  flags: Record<string, string>;
  flagNames: string[];

  // Adding this for demo purposes. It should be removed before merging.
  userMeta: Record<string, string | undefined>;
}

export function registerUsageCollector(
  usageCollection: UsageCollectionSetup,
  getLaunchDarklyEntities: () => { launchDarklyUser?: LDUser; launchDarklyClient: LDClient }
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
          DYNAMIC_KEY: {
            type: 'keyword',
            _meta: { description: 'Flags received by the client' },
          },
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

        // Adding this for demo purposes. It should be removed before merging.
        userMeta: {
          DYNAMIC_KEY: {
            type: 'keyword',
            _meta: { description: 'User property sent to the A/B testing service' },
          },
        },
      },
      fetch: async () => {
        const { launchDarklyUser, launchDarklyClient } = getLaunchDarklyEntities();
        if (!launchDarklyUser)
          return { initialized: false, flagNames: [], flags: {}, userMeta: {} };
        // According to the docs, this method does not send analytics back to LaunchDarkly, so it does not provide false results
        const flagsState = await launchDarklyClient.allFlagsState(launchDarklyUser);
        const flags = flagsState.allValues();
        const { custom, ...userMeta } = launchDarklyUser;
        return {
          initialized: flagsState.valid,
          flags,
          flagNames: Object.keys(flags),
          userMeta: { ...userMeta, ...custom } as unknown as Record<string, string>,
        };
      },
    })
  );
}

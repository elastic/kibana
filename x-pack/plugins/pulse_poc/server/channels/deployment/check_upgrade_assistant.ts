/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SemVer } from 'semver';
import { IScopedClusterClient, IClusterClient } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { PulseInstruction } from 'src/core/server/pulse/channel';
import { PulsePOCCheckFunction, PulsePOCSetupFunction } from '../../types';

const mappings = {
  properties: {}, // TODO: Define based on content
};

const RECIPIES_INSTRUCTIONS_INDEX = 'pulse-upgrade-assistant-guides';

async function ensureIndex(es: IClusterClient, index: string, body: any) {
  const exists = await es.callAsInternalUser('indices.exists', {
    index,
  });
  if (!exists) {
    await es.callAsInternalUser('indices.create', { index, body });
  }
}

async function ensureRecipiesIndex(es: IClusterClient) {
  const versionMapping = {
    type: 'keyword',
    fields: {
      major: {
        type: 'keyword',
        normalizer: 'major',
      },
      minor: {
        type: 'keyword',
        normalizer: 'minor',
      },
      patch: {
        type: 'keyword',
        normalizer: 'patch',
      },
    },
  };
  await ensureIndex(es, RECIPIES_INSTRUCTIONS_INDEX, {
    settings: {
      analysis: {
        normalizer: {
          major: {
            char_filter: ['major'],
          },
          minor: {
            char_filter: ['minor'],
          },
          patch: {
            char_filter: ['patch'],
          },
        },
        char_filter: {
          major: {
            pattern: '^(\\d+)(.*)',
            type: 'pattern_replace',
            replacement: '$1',
          },
          minor: {
            pattern: '^(\\d+\\.\\d+)(.*)',
            type: 'pattern_replace',
            replacement: '$1',
          },
          patch: {
            pattern: '^(\\d+\\.\\d+\\.\\d+)(.*)',
            type: 'pattern_replace',
            replacement: '$1',
          },
        },
      },
    },
    mappings: {
      properties: {
        targetVersion: versionMapping,
        fromVersion: versionMapping,
      },
    },
  });
}

export const setup: PulsePOCSetupFunction = async (es, index) => {
  await ensureIndex(es, index, {
    settings: {
      number_of_shards: 1,
      // TODO: add pipeline to add the geoip
    },
    mappings,
  });
  await ensureRecipiesIndex(es);
};

export interface UpgradeAssistantGuideDocs {
  fromVersion: string;
  targetVersion: string;
  guide: UpgradeAssistantRecipeEntry[];
}

export interface UpgradeAssistantRecipeEntry {
  checks?: Array<{
    method: string;
    options: any;
    path: string;
    value: {
      [key in 'eq' | 'gt' | 'lt']?: any;
    };
  }>;
  description: string;
  docLink: string | undefined;
  substeps?: UpgradeAssistantRecipeEntry[];
}

export interface UpgradeAssistantInstruction extends PulseInstruction {
  upgradeAssistant: { [targetVersion: string]: UpgradeAssistantRecipeEntry[] };
}

export const check: PulsePOCCheckFunction<UpgradeAssistantInstruction> = async (
  es,
  { deploymentId, indexName }
) => {
  const {
    hits: {
      hits: [hit],
    },
  } = await es.callAsInternalUser('search', {
    index: indexName,
    size: 1, // We only need 1 in this channel.
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      query: {
        term: {
          deployment_id: {
            value: deploymentId,
          },
        },
      },
    },
  });

  if (hit?._source) {
    const upgradeAssistant = await retrieveInstructions(es, hit._source);
    return upgradeAssistant ? [{ upgradeAssistant }] : [];
  }

  return [];
};

async function retrieveInstructions(
  elasticsearch: IScopedClusterClient,
  document: any
): Promise<{ [targetVersion: string]: UpgradeAssistantRecipeEntry[] } | undefined> {
  const minimumVersion = document.stats.nodes.versions.reduce(
    (acc: SemVer | undefined, version: string) => {
      const semVersion = new SemVer(version);
      if (acc && acc.compare(semVersion) < 0) {
        return acc;
      } else {
        return semVersion;
      }
    },
    undefined
  );

  if (minimumVersion) {
    const { major, minor, patch } = minimumVersion;
    const {
      hits: { hits },
    } = await elasticsearch.callAsInternalUser('search', {
      index: RECIPIES_INSTRUCTIONS_INDEX,
      allow_no_indices: true,
      ignore_unavailable: true,
      size: 1,
      body: {
        query: {
          bool: {
            must: [
              // Filter matching fromVersion
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must: [
                          { term: { 'fromVersion.major': major } },
                          {
                            range: {
                              'fromVersion.minor': { lt: `${major}.${minor}`, boost: 2.0 },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          { term: { 'fromVersion.major': major } },
                          { term: { 'fromVersion.minor': `${major}.${minor}` } },
                          {
                            range: {
                              'fromVersion.patch': {
                                lte: `${major}.${minor}.${patch}`,
                                boost: 4.0,
                              },
                            },
                          },
                        ],
                      },
                    },
                    { range: { 'fromVersion.major': { lt: major } } },
                  ],
                },
              },
              // Filter matching targetVersion
              {
                bool: {
                  should: [
                    { range: { 'targetVersion.major': { gt: major, boost: 2.0 } } },
                    {
                      bool: {
                        must: [
                          { term: { 'targetVersion.major': major } },
                          { range: { 'targetVersion.minor': { gt: `${major}.${minor}` } } },
                        ],
                      },
                    },
                    {
                      bool: {
                        must: [
                          { term: { 'targetVersion.major': major } },
                          { term: { 'targetVersion.minor': `${major}.${minor}` } },
                          {
                            range: { 'targetVersion.patch': { gt: `${major}.${minor}.${patch}` } },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    return hits.reduce(
      (
        acc: { [targetVersion: string]: UpgradeAssistantRecipeEntry[] },
        hit: { _source: UpgradeAssistantGuideDocs }
      ) => {
        return {
          ...acc,
          [hit._source.targetVersion]: hit._source.guide,
        };
      },
      {}
    );
  }

  return void 0;
}

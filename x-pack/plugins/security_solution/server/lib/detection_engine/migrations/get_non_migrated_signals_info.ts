/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { IndexVersionsByIndex } from './get_index_versions_by_index';
import { getIndexVersionsByIndex } from './get_index_versions_by_index';
import {
  getSignalVersionsByIndex,
  type SignalVersionsByIndex,
} from './get_signal_versions_by_index';
import { isOutdated as getIsOutdated, signalsAreOutdated } from './helpers';
import { getLatestIndexTemplateVersion } from './get_latest_index_template_version';
import { getIndexAliasPerSpace } from './get_index_alias_per_space';
import { getOldestSignalTimestamp } from './get_oldest_signal_timestamp';

interface OutdatedSpaces {
  isMigrationRequired: boolean;
  spaces: string[];
  indices: string[];
  fromRange?: string;
}

/**
 * gets lists of spaces that have non-migrated signal indices and time of oldest non-migrated document, from which migration is required
 */
export const getNonMigratedSignalsInfo = async ({
  esClient,
  signalsIndex,
  logger,
}: {
  esClient: ElasticsearchClient;
  signalsIndex: string;
  logger: Logger;
}): Promise<OutdatedSpaces> => {
  const signalsAliasAllSpaces = `${signalsIndex}-*`;

  try {
    const latestTemplateVersion = await getLatestIndexTemplateVersion({
      esClient,
      name: signalsAliasAllSpaces,
    });
    const indexAliasesMap = await getIndexAliasPerSpace({
      esClient,
      signalsAliasAllSpaces,
      signalsIndex,
    });

    const indices = Object.keys(indexAliasesMap);

    if (indices.length === 0) {
      return {
        isMigrationRequired: false,
        spaces: [],
        indices: [],
      };
    }

    let indexVersionsByIndex: IndexVersionsByIndex = {};
    try {
      indexVersionsByIndex = await getIndexVersionsByIndex({
        esClient,
        index: indices,
      });
    } catch (e) {
      logger.debug(
        `Getting information about legacy siem signals index version failed:"${e?.message}"`
      );
    }

    let signalVersionsByIndex: SignalVersionsByIndex = {};
    try {
      signalVersionsByIndex = await getSignalVersionsByIndex({
        esClient,
        index: indices,
      });
    } catch (e) {
      logger.debug(`Getting information about legacy siem signals versions failed:"${e?.message}"`);
    }

    const outdatedIndices = indices.reduce<Array<{ indexName: string; space: string }>>(
      (acc, indexName) => {
        const version = indexVersionsByIndex[indexName] ?? 0;
        const signalVersions = signalVersionsByIndex[indexName] ?? [];

        const isOutdated =
          getIsOutdated({ current: version, target: latestTemplateVersion }) ||
          signalsAreOutdated({ signalVersions, target: latestTemplateVersion });

        if (isOutdated) {
          acc.push({
            indexName,
            space: indexAliasesMap[indexName].space,
          });
        }

        return acc;
      },
      []
    );

    if (outdatedIndices.length === 0) {
      return {
        isMigrationRequired: false,
        spaces: [],
        indices: [],
      };
    }

    const outdatedIndexNames = outdatedIndices.map((outdatedIndex) => outdatedIndex.indexName);

    const fromRange = await getOldestSignalTimestamp({
      esClient,
      logger,
      index: outdatedIndexNames,
    });

    // remove duplicated spaces
    const spaces = [...new Set<string>(outdatedIndices.map((indexStatus) => indexStatus.space))];
    const isMigrationRequired = outdatedIndices.length > 0;

    logger.debug(
      isMigrationRequired
        ? `Legacy siem signals indices require migration: "${outdatedIndexNames.join(
            ', '
          )}" in "${spaces.join(', ')}" spaces`
        : 'No legacy siem indices require migration'
    );

    return {
      isMigrationRequired,
      spaces,
      fromRange,
      indices: outdatedIndexNames,
    };
  } catch (e) {
    logger.debug(`Getting information about legacy siem signals failed:"${e?.message}"`);
    return {
      isMigrationRequired: false,
      spaces: [],
      indices: [],
    };
  }
};

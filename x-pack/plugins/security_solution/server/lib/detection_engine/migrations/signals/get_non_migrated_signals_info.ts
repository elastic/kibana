/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { getIndexVersionsByIndex } from '../get_index_versions_by_index';
import { getSignalVersionsByIndex } from '../get_signal_versions_by_index';
import { isOutdated as getIsOutdated, signalsAreOutdated } from '../helpers';
import { getLatestIndexTemplateVersion } from './get_latest_index_template_version';
import { getIndexAliasPerSpace } from './get_index_alias_per_space';
import { getOldestSignalTimestamp } from './get_oldest_signal';

interface OutdatedSpaces {
  isMigrationRequired: boolean;
  spaces: string[];
  indices: string[];
  fromRange: string | undefined;
}

/**
 * gets lists of spaces that have non-migrated signal indices and time of oldest non-migrated document, from which migration is required
 */
export const getNonMigratedSignalsInfo = async ({
  esClient,
  signalsIndex,
}: {
  esClient: ElasticsearchClient;
  signalsIndex: string;
}): Promise<OutdatedSpaces> => {
  const signalsAliasAllSpaces = `${signalsIndex}-*`;

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

  const indexVersionsByIndex = await getIndexVersionsByIndex({
    esClient,
    index: indices,
  });

  const signalVersionsByIndex = await getSignalVersionsByIndex({
    esClient,
    index: indices,
  });

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

  const outdatedIndexNames = outdatedIndices.map((outdatedIndex) => outdatedIndex.indexName);

  const fromRange = await getOldestSignalTimestamp({
    esClient,
    index: outdatedIndexNames,
  });

  // remove duplicated spaces
  const spaces = [...new Set<string>(outdatedIndices.map((indexStatus) => indexStatus.space))];

  return {
    isMigrationRequired: outdatedIndices.length > 0,
    spaces,
    fromRange,
    indices: outdatedIndexNames,
  };
};

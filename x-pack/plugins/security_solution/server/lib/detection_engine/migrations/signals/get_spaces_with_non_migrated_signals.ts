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

interface OutdatedSpaces {
  isMigrationRequired: boolean;
  spaces: string[];
  indices: string[];
  fromRange: string | undefined;
}

interface IndexAlias {
  alias: string;
  space: string;
  indexName: string;
}
/**
 * gets lists of spaces that have non-migrated signal indices and time of oldest non-migrated document, from which migration is required
 */
export const getSpacesWithNonMigratedSignals = async ({
  esClient,
  signalsIndex,
}: {
  esClient: ElasticsearchClient;
  signalsIndex: string;
}): Promise<OutdatedSpaces> => {
  const signalsAliasAllSpaces = `${signalsIndex}-*`;

  let latestTemplateVersion: number;
  try {
    const response = await esClient.indices.getIndexTemplate({ name: signalsAliasAllSpaces });
    const versions = response.index_templates.map(
      (template) => template.index_template.version ?? 0
    );

    latestTemplateVersion = Math.max(...versions);
  } catch (e) {
    latestTemplateVersion = 0;
  }

  // TODO: remove console.log
  // console.log('latestTemplateVersion', latestTemplateVersion);

  const response = await esClient.indices.getAlias(
    {
      name: signalsAliasAllSpaces,
    },
    { meta: true }
  );

  const indexAliasesMap: Record<string, IndexAlias> = Object.keys(response.body).reduce<
    Record<string, IndexAlias>
  >((acc, indexName) => {
    if (!indexName.startsWith('.internal.alerts-')) {
      const alias = Object.keys(response.body[indexName].aliases)[0];

      acc[indexName] = {
        alias,
        space: alias.replace(`${signalsIndex}-`, ''),
        indexName,
      };
    }

    return acc;
  }, {});

  // TODO: remove console.log
  // console.log('indexAliases', indexAliasesMap);

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

  const responseX = await esClient.search({
    index: outdatedIndexNames,
    size: 0,
    body: {
      aggs: {
        min_timestamp: {
          min: {
            field: '@timestamp',
          },
        },
      },
    },
  });

  // TODO: remove console.log
  // console.log('indexAliases', indexAliasesMap);
  // console.log('indexVersionsByIndex', indexVersionsByIndex);
  // console.log('signalVersionsByIndex', signalVersionsByIndex);

  // console.log('........... outdatedIndices', outdatedIndices);
  // console.log('........... responseX', responseX);

  // TODO: fix TS
  // @ts-expect-error
  const fromRange = responseX.aggregations?.min_timestamp?.value_as_string;

  // remove duplicated spaces
  const spaces = [...new Set<string>(outdatedIndices.map((indexStatus) => indexStatus.space))];
  return {
    isMigrationRequired: outdatedIndices.length > 0,
    spaces,
    fromRange,
    indices: outdatedIndexNames,
  };
};

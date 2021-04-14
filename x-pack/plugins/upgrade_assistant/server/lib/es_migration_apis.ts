/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'src/core/server';
import { indexSettingDeprecations } from '../../common/constants';
import {
  DeprecationAPIResponse,
  EnrichedDeprecationInfo,
  UpgradeAssistantStatus,
} from '../../common/types';

import { esIndicesStateCheck } from './es_indices_state_check';

export async function getUpgradeAssistantStatus(
  dataClient: IScopedClusterClient,
  isCloudEnabled: boolean
): Promise<UpgradeAssistantStatus> {
  const { body: deprecations } = await dataClient.asCurrentUser.migration.deprecations();

  const cluster = getClusterDeprecations(deprecations, isCloudEnabled);
  const indices = getCombinedIndexInfos(deprecations);

  const indexNames = indices.map(({ index }) => index!);

  // If we have found deprecation information for index/indices check whether the index is
  // open or closed.
  if (indexNames.length) {
    const indexStates = await esIndicesStateCheck(dataClient.asCurrentUser, indexNames);

    indices.forEach((indexData) => {
      indexData.blockerForReindexing =
        indexStates[indexData.index!] === 'closed' ? 'index-closed' : undefined;
    });
  }

  const criticalWarnings = cluster.concat(indices).filter((d) => d.level === 'critical');

  return {
    readyForUpgrade: false,
    cluster: [
      {
        level: 'critical',
        message: 'Index Lifecycle Management poll interval is set too low',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#ilm-poll-interval-limit',
        details:
          'The Index Lifecycle Management poll interval setting [indices.lifecycle.poll_interval] is currently set to [500ms], but must be 1s or greater',
      },
      {
        level: 'warning',
        message: 'Index templates contain _field_names settings.',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#fieldnames-enabling',
        details:
          'Index templates [field_names_enabled] use the deprecated `enable` setting for the `_field_names` field. Using this setting in new index mappings will throw an error in the next major version and needs to be removed from existing mappings and templates.',
      },
    ],
    indices: [
      {
        level: 'warning',
        message: 'translog retention settings are ignored',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html',
        details:
          'translog retention settings [index.translog.retention.size] and [index.translog.retention.age] are ignored because translog is no longer used in peer recoveries with soft-deletes enabled (default in 7.0 or later)',
        index: 'deprecated_settings',
        reindex: false,
      },
      {
        level: 'warning',
        message: 'translog retention settings are ignored',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html',
        details:
          'translog retention settings [index.translog.retention.size] and [index.translog.retention.age] are ignored because translog is no longer used in peer recoveries with soft-deletes enabled (default in 7.0 or later)',
        index: 'settings',
        reindex: false,
      },
      {
        level: 'warning',
        message: 'Multi-fields within multi-fields',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#_defining_multi_fields_within_multi_fields',
        details:
          'The names of fields that contain chained multi-fields: [[type: _doc, field: text]]',
        index: 'nested_multi_fields',
        reindex: false,
      },
      {
        level: 'critical',
        message: 'Index created before 7.0',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html',
        details: 'This index was created using version: 6.8.13',
        index: 'test2',
        reindex: true,
      },
      {
        level: 'warning',
        message: 'Multi-fields within multi-fields',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#_defining_multi_fields_within_multi_fields',
        details:
          'The names of fields that contain chained multi-fields: [[type: _doc, field: test]]',
        index: 'foo',
        reindex: false,
      },
      {
        level: 'warning',
        message: 'Index mapping contains explicit `_field_names` enabling settings.',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#fieldnames-enabling',
        details:
          'The index mapping contains a deprecated `enabled` setting for `_field_names` that should be removed moving foward.',
        index: 'field_names_enabled',
        reindex: false,
      },
      {
        level: 'warning',
        message: 'Index mapping contains explicit `_field_names` enabling settings.',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#fieldnames-enabling',
        details:
          'The index mapping contains a deprecated `enabled` setting for `_field_names` that should be removed moving foward.',
        index: 'tweets',
        reindex: false,
      },
      {
        level: 'warning',
        message: 'translog retention settings are ignored',
        url:
          'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html',
        details:
          'translog retention settings [index.translog.retention.size] and [index.translog.retention.age] are ignored because translog is no longer used in peer recoveries with soft-deletes enabled (default in 7.0 or later)',
        index: 'translog_settings',
        reindex: false,
      },
    ],
  };
}

// Reformats the index deprecations to an array of deprecation warnings extended with an index field.
const getCombinedIndexInfos = (deprecations: DeprecationAPIResponse) =>
  Object.keys(deprecations.index_settings).reduce((indexDeprecations, indexName) => {
    return indexDeprecations.concat(
      deprecations.index_settings[indexName].map(
        (d) =>
          ({
            ...d,
            index: indexName,
            reindex: /Index created before/.test(d.message),
            deprecatedIndexSettings: getIndexSettingDeprecations(d.message),
          } as EnrichedDeprecationInfo)
      )
    );
  }, [] as EnrichedDeprecationInfo[]);

const getClusterDeprecations = (deprecations: DeprecationAPIResponse, isCloudEnabled: boolean) => {
  const combined = deprecations.cluster_settings
    .concat(deprecations.ml_settings)
    .concat(deprecations.node_settings);

  if (isCloudEnabled) {
    // In Cloud, this is changed at upgrade time. Filter it out to improve upgrade UX.
    return combined.filter((d) => d.message !== 'Security realm settings structure changed');
  } else {
    return combined;
  }
};

const getIndexSettingDeprecations = (message: string) => {
  const indexDeprecation = Object.values(indexSettingDeprecations).find(
    ({ deprecationMessage }) => deprecationMessage === message
  );

  return indexDeprecation?.settings || [];
};

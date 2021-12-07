/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flow, omit } from 'lodash';
import { ReindexWarning } from '../../../common/types';
import { versionService } from '../version';
import { FlatSettings, FlatSettingsWithTypeName } from './types';
export interface ParsedIndexName {
  cleanIndexName: string;
  baseName: string;
  newIndexName: string;
  cleanBaseName: string;
}
/**
 * An array of deprecated index settings specific to 7.0 --> 8.0 upgrade
 * This excludes the deprecated translog retention settings
 * as these are only marked as deprecated if soft deletes is enabled
 * See logic in getDeprecatedSettingWarning() for more details
 */
const deprecatedSettings = [
  'index.force_memory_term_dictionary',
  'index.max_adjacency_matrix_filters',
  'index.soft_deletes.enabled',
];

/**
 * Validates, and updates deprecated settings and mappings to be applied to the
 * new updated index.
 */
export const transformFlatSettings = (flatSettings: FlatSettings) => {
  const settings = transformSettings(flatSettings.settings);
  const mappings = transformMappings(flatSettings.mappings);

  return { settings, mappings };
};

/**
 * Provides the assumed source of the index name stripping any prefixing
 * introduced by the upgrade assistant
 *
 * Examples:
 *   .reindex-v7-foo => .foo
 *   reindex-v7-foo => foo
 *
 * @param indexName
 */
export const sourceNameForIndex = (indexName: string): string => {
  const matches = indexName.match(/^([\.])?(.*)$/) || [];
  const internal = matches[1] || '';
  const baseName = matches[2];

  // in 6.7+ we prepend to avoid conflicts with index patterns/templates/etc
  const reindexedMatcher = new RegExp(`reindexed-v${versionService.getPrevMajorVersion()}-`, 'g');

  const cleanBaseName = baseName.replace(reindexedMatcher, '');
  return `${internal}${cleanBaseName}`;
};

/**
 * Provides the index name to re-index into
 *
 * .foo -> .reindexed-v7-foo
 * foo => reindexed-v7-foo
 */
export const generateNewIndexName = (indexName: string): string => {
  const sourceName = sourceNameForIndex(indexName);
  const currentVersion = `reindexed-v${versionService.getMajorVersion()}`;

  return indexName.startsWith('.')
    ? `.${currentVersion}-${sourceName.substr(1)}`
    : `${currentVersion}-${sourceName}`;
};

export const getCustomTypeWarning = (
  flatSettings: FlatSettingsWithTypeName | FlatSettings
): ReindexWarning | undefined => {
  const DEFAULT_TYPE_NAME = '_doc';
  // In 7+, it's not possible to have more than one type,
  // so always grab the first (and only) key.
  const typeName = Object.getOwnPropertyNames(flatSettings.mappings)[0];
  const typeNameWarning = Boolean(typeName && typeName !== DEFAULT_TYPE_NAME);

  if (typeNameWarning) {
    return {
      warningType: 'customTypeName',
      meta: {
        typeName,
      },
    };
  }
};

export const getDeprecatedSettingWarning = (
  flatSettings: FlatSettingsWithTypeName | FlatSettings
): ReindexWarning | undefined => {
  const { settings } = flatSettings;

  const deprecatedSettingsInUse = Object.keys(settings || {}).filter((setting) => {
    return deprecatedSettings.indexOf(setting) > -1;
  });

  // Translog settings are only marked as deprecated if soft deletes is enabled
  // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
  if (settings['index.soft_deletes.enabled'] === 'true') {
    // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
    if (settings['index.translog.retention.size']) {
      deprecatedSettingsInUse.push('index.translog.retention.size');
    }

    // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
    if (settings['index.translog.retention.age']) {
      deprecatedSettingsInUse.push('index.translog.retention.age');
    }
  }

  if (deprecatedSettingsInUse.length) {
    return {
      warningType: 'indexSetting',
      meta: {
        deprecatedSettings: deprecatedSettingsInUse,
      },
    };
  }
};

/**
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (
  flatSettings: FlatSettingsWithTypeName | FlatSettings
): ReindexWarning[] => {
  const warnings = [] as ReindexWarning[];

  if (versionService.getMajorVersion() === 7) {
    const customTypeWarning = getCustomTypeWarning(flatSettings);
    const deprecatedSettingWarning = getDeprecatedSettingWarning(flatSettings);

    if (customTypeWarning) {
      warnings.push(customTypeWarning);
    }

    if (deprecatedSettingWarning) {
      warnings.push(deprecatedSettingWarning);
    }
  }

  return warnings;
};

const removeUnsettableSettings = (settings: FlatSettings['settings']) =>
  omit(settings, [
    // Private ES settings
    'index.allocation.existing_shards_allocator',
    'index.blocks.write',
    'index.creation_date',
    'index.frozen',
    'index.history.uuid',
    'index.merge.enabled',
    'index.provided_name',
    'index.resize.source.name',
    'index.resize.source.uuid',
    'index.routing.allocation.initial_recovery._id',
    'index.search.throttled',
    'index.source_only',
    'index.shrink.source.name',
    'index.shrink.source.uuid',
    'index.store.snapshot.repository_name',
    'index.store.snapshot.snapshot_name',
    'index.store.snapshot.snapshot_uuid',
    'index.store.snapshot.index_name',
    'index.store.snapshot.index_uuid',
    'index.uuid',
    'index.verified_before_close',
    'index.version.created',

    // Ignored since 6.x and forbidden in 7.x
    'index.mapper.dynamic',

    // Deprecated in 9.0
    'index.version.upgraded',
  ]);

const removeDeprecatedSettings = (settings: FlatSettings['settings']) => {
  const updatedSettings = { ...settings };

  // Translog settings are only marked as deprecated if soft deletes is enabled
  // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
  if (updatedSettings['index.soft_deletes.enabled'] === 'true') {
    // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
    if (updatedSettings['index.translog.retention.size']) {
      // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
      delete updatedSettings['index.translog.retention.size'];
    }

    // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
    if (settings['index.translog.retention.age']) {
      // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
      delete updatedSettings['index.translog.retention.age'];
    }
  }

  return omit(updatedSettings, deprecatedSettings);
};

// Use `flow` to pipe the settings through each function.
const transformSettings = flow(removeUnsettableSettings, removeDeprecatedSettings);

const updateFixableMappings = (mappings: FlatSettings['mappings']) => {
  return mappings;
};

const transformMappings = flow(updateFixableMappings);

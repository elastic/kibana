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

/**
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (
  flatSettings: FlatSettingsWithTypeName | FlatSettings
): ReindexWarning[] => {
  const warnings = [
    // No warnings yet for 8.0 -> 9.0
  ] as Array<[ReindexWarning, boolean]>;

  if (versionService.getMajorVersion() === 7) {
    const DEFAULT_TYPE_NAME = '_doc';
    // In 7+ it's not possible to have more than one type anyways, so always grab the first
    // (and only) key.
    const typeName = Object.getOwnPropertyNames(flatSettings.mappings)[0];

    const typeNameWarning = Boolean(typeName && typeName !== DEFAULT_TYPE_NAME);

    warnings.push([ReindexWarning.customTypeName, typeNameWarning]);
  }

  return warnings.filter(([_, applies]) => applies).map(([warning, _]) => warning);
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

    // Deprecated in 9.0
    'index.version.upgraded',
  ]);

const validateSettings = (settings: FlatSettings['settings']) => {
  if (settings['index.mapper.dynamic']) {
    throw new Error(`'index.mapper.dynamic' is no longer supported.`);
  }

  if (settings['index.merge.policy.reclaim_deletes_weight']) {
    throw new Error(`'index.merge.policy.reclaim_deletes_weight' is no longer supported.`);
  }

  if (settings['index.force_memory_term_dictionary']) {
    throw new Error(`'index.force_memory_term_dictionary' is no longer supported.`);
  }

  if (settings['index.max_adjacency_matrix_filters']) {
    throw new Error(
      `'index.max_adjacency_matrix_filters' is no longer supported; use 'indices.query.bool.max_clause_count' as an alternative.`
    );
  }

  return settings;
};

// Use `flow` to pipe the settings through each function.
const transformSettings = flow(removeUnsettableSettings, validateSettings);

const updateFixableMappings = (mappings: FlatSettings['mappings']) => {
  return mappings;
};

const transformMappings = flow(updateFixableMappings);

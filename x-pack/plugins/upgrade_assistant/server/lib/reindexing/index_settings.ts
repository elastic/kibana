/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, omit } from 'lodash';
import {
  CURRENT_MAJOR_VERSION,
  PREV_MAJOR_VERSION,
} from 'x-pack/plugins/upgrade_assistant/common/version';
import { ReindexWarning } from '../../../common/types';
import { isLegacyApmIndex } from '../apm';
import { FlatSettings } from './types';

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
 * Parses an index name
 * @param indexName
 */
export const parseIndexName = (indexName: string): ParsedIndexName => {
  const matches = indexName.match(/^([\.])?(.*)$/) || [];
  const internal = matches[1] || '';
  const baseName = matches[2];

  const currentVersion = `reindexed-v${CURRENT_MAJOR_VERSION}`;

  // in 5.6 the upgrade assistant appended to the index, in 6.7+ we prepend to
  // avoid conflicts with index patterns/templates/etc
  const reindexedMatcher = new RegExp(`(-reindexed-v5$|reindexed-v${PREV_MAJOR_VERSION}-)`, 'g');

  const cleanBaseName = baseName.replace(reindexedMatcher, '');

  return {
    cleanIndexName: `${internal}${cleanBaseName}`,
    baseName,
    cleanBaseName,
    newIndexName: `${internal}${currentVersion}-${cleanBaseName}`,
  };
};

/**
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (
  flatSettings: FlatSettings,
  apmIndexPatterns: string[] = []
): ReindexWarning[] => {
  const indexName = flatSettings.settings['index.provided_name'];
  const apmReindexWarning = isLegacyApmIndex(indexName, apmIndexPatterns, flatSettings.mappings);

  const warnings = [[ReindexWarning.apmReindex, apmReindexWarning]] as Array<
    [ReindexWarning, boolean]
  >;

  return warnings.filter(([_, applies]) => applies).map(([warning, _]) => warning);
};

const removeUnsettableSettings = (settings: FlatSettings['settings']) =>
  omit(settings, [
    'index.uuid',
    'index.blocks.write',
    'index.creation_date',
    'index.legacy',
    'index.mapping.single_type',
    'index.provided_name',
    'index.routing.allocation.initial_recovery._id',
    'index.version.created',
    'index.version.upgraded',
  ]);

// Use `flow` to pipe the settings through each function.
const transformSettings = flow(removeUnsettableSettings);

const updateFixableMappings = (mappings: FlatSettings['mappings']) => {
  // TODO: change type to _doc
  return mappings;
};

const transformMappings = flow(updateFixableMappings);

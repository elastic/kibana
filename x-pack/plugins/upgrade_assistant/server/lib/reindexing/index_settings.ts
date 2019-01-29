/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, omit } from 'lodash';
import { ReindexWarning } from '../../../common/types';
import { FlatSettings } from './types';

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
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (flatSettings: FlatSettings): ReindexWarning[] => {
  const warnings = [
    // No warnings yet for 7.0 -> 8.0
  ] as Array<[ReindexWarning, boolean]>;

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, omit } from 'lodash';
import {
  CURRENT_MAJOR_VERSION,
  NEXT_MAJOR_VERSION,
  PREV_MAJOR_VERSION,
} from 'x-pack/plugins/upgrade_assistant/common/version';
import { ReindexWarning } from '../../../common/types';
import { FlatSettings, MappingProperties, TypeMapping } from './types';

export interface ParsedIndexName {
  cleanIndexName: string;
  baseName: string;
  newIndexName: string;
  cleanBaseName: string;
}

// the security indices must be whitelisted and follow the pattern set forth in v5
const SECURITY_MATCHER = new RegExp(`^.security(-[67])?$`);
const SECURITY_SOURCE = '.security';

// in 5.6 the upgrade assistant appended to the index, in 6.7+ we prepend to
// avoid conflicts with index patterns/templates/etc
const REINDEXED_MATCHER = new RegExp(`(-reindexed-v5$|reindexed-v${PREV_MAJOR_VERSION}-)`, 'g');

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

  // special handling for security index
  if (indexName.match(SECURITY_MATCHER)) {
    return SECURITY_SOURCE;
  }

  const cleanBaseName = baseName.replace(REINDEXED_MATCHER, '');

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
  const currentVersion = `reindexed-v${CURRENT_MAJOR_VERSION}`;

  if (sourceName === SECURITY_SOURCE) {
    return `${SECURITY_SOURCE}-${NEXT_MAJOR_VERSION}`;
  }

  return indexName.startsWith('.')
    ? `.${currentVersion}-${sourceName.substr(1)}`
    : `${currentVersion}-${sourceName}`;
};

/**
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (flatSettings: FlatSettings): ReindexWarning[] => {
  const mapping = getSingleMappingType(flatSettings.mappings);

  const warnings = [
    [ReindexWarning.allField, Boolean(mapping && mapping._all && mapping._all.enabled)],
    [
      ReindexWarning.booleanFields,
      Boolean(mapping && mapping.properties && findBooleanFields(mapping.properties).length > 0),
    ],
  ] as Array<[ReindexWarning, boolean]>;

  return warnings.filter(([_, applies]) => applies).map(([warning, _]) => warning);
};

/**
 * Returns an array of field paths for all boolean fields, where each field path is an array of strings.
 * Example:
 *    For the mapping type:
 *    ```
 *      {
 *        "field1": { "type": "boolean" },
 *        "nested": {
 *          "field2": { "type": "boolean" }
 *        }
 *      }
 *    ```
 *    The fieldPaths would be: `[['field1'], ['nested', 'field2']]`
 * @param properties
 */
export const findBooleanFields = (properties: MappingProperties): string[][] =>
  Object.keys(properties).reduce(
    (res, propertyName) => {
      if (properties[propertyName].type === 'boolean') {
        // If this field is a boolean, add it
        res.push([propertyName]);
      } else if (properties[propertyName].properties) {
        // If this is a nested object/array get the nested fields and prepend the field path with the current field.
        const nested = findBooleanFields(properties[propertyName].properties!);
        res = [...res, ...nested.map(n => [propertyName, ...n])];
      }

      return res;
    },
    [] as string[][]
  );

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

const updateFixableSettings = (settings: FlatSettings['settings']) => {
  const delayedTimeout = settings['index.unassigned.node_left.delayed_timeout'];
  if (delayedTimeout && parseInt(delayedTimeout, 10) < 0) {
    settings['index.unassigned.node_left.delayed_timeout'] = '0';
  }

  return settings;
};

const validateSettings = (settings: FlatSettings['settings']) => {
  if (settings['index.shard.check_on_startup'] === 'fix') {
    throw new Error(`index.shard.check_on_startup cannot be set to 'fix'`);
  }

  if (settings['index.percolator.map_unmapped_fields_as_string']) {
    throw new Error(`index.percolator.map_unmapped_fields_as_string is no longer supported.`);
  }

  return settings;
};

// Use `flow` to pipe the settings through each function.
const transformSettings = flow(
  removeUnsettableSettings,
  updateFixableSettings,
  validateSettings
);

const updateFixableMappings = (mappings: FlatSettings['mappings']) => {
  if (mappings._default_) {
    delete mappings._default_;
  }

  const mapping = getSingleMappingType(mappings);
  if (mapping && mapping._all) {
    delete mapping._all;
  }

  return mappings;
};

const transformMappings = flow(updateFixableMappings);

export const getSingleMappingType = (
  mappings: FlatSettings['mappings']
): TypeMapping | undefined => {
  const mappingTypes = Object.keys(mappings)
    // Ignore _default_ mapping types.
    .filter(t => t !== '_default_');

  if (mappingTypes.length > 1) {
    throw new Error(`Indices with more than one mapping type are not supported in 7.0.`);
  }

  return mappings[mappingTypes[0]];
};

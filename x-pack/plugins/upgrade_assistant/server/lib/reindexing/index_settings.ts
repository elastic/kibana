/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, omit } from 'lodash';
import { FlatSettings, MappingProperties, ReindexWarning, TypeMapping } from './types';

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
    'index.routing.allocation.initial_recovery._id',
    'index.version.created',
    'index.version.upgraded',
    'index.provided_name',
    'index.legacy',
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

  return mappings;
};

const validateMappings = (mappings: FlatSettings['mappings']) => {
  const mapping = getSingleMappingType(mappings);

  // _all field not supported.
  if (mapping && mapping._all) {
    if (mapping._all.enabled) {
      throw new Error(`Mapping types with _all.enabled are not supported in 7.0.`);
    } else {
      delete mapping._all;
    }
  }

  return mappings;
};

const transformMappings = flow(
  updateFixableMappings,
  validateMappings
);

const getSingleMappingType = (mappings: FlatSettings['mappings']): TypeMapping | undefined => {
  const mappingTypes = Object.keys(mappings);

  if (mappingTypes.length > 1) {
    throw new Error(`Indices with more than one mapping type are not supported in 7.0.`);
  }

  return mappings[mappingTypes[0]];
};

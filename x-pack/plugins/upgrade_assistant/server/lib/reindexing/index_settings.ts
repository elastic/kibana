/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { flow, omit } from 'lodash';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';

/**
 * Fetches, validates, and updates deprecated settings and mappings to be applied to the
 * new updated index.
 *
 * @param callCluster
 * @param indexName
 */
export const getIndexSettings = async (callCluster: CallCluster, indexName: string) => {
  const indexInfo = await callCluster('transport.request', {
    path: `/${encodeURIComponent(indexName)}?flat_settings`,
  });

  if (!indexInfo[indexName]) {
    throw Boom.notFound(`Index ${indexName} does not exist.`);
  }

  return transformIndexInfo(indexInfo[indexName]);
};

/**
 * Exported only for tests
 */
export const transformIndexInfo = (indexInfo: any) => {
  const settings = transformSettings(indexInfo.settings);
  const mappings = transformMappings(indexInfo.mappings);

  return { settings, mappings };
};

const removeUnsettableSettings = (settings: object) =>
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

const updateFixableSettings = (settings: any) => {
  const delayedTimeout = settings['index.unassigned.node_left.delayed_timeout'];
  if (delayedTimeout && delayedTimeout < 0) {
    settings['index.unassigned.node_left.delayed_timeout'] = 0;
  }

  return settings;
};

const validateSettings = (settings: any) => {
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

const updateFixableMappings = (mappings: any) => {
  if (mappings._default_) {
    delete mappings._default_;
  }

  return mappings;
};

const validateMappings = (mappings: any) => {
  const mappingTypes = Object.keys(mappings);

  if (mappingTypes.length > 1) {
    throw new Error(`Indices with more than one mapping type are not supported in 7.0.`);
  }

  // _all field not supported.
  if (mappings[mappingTypes[0]] && mappings[mappingTypes[0]]._all) {
    if (mappings[mappingTypes[0]]._all.enabled) {
      throw new Error(`Mapping types with _all.enabled are not supported in 7.0.`);
    } else {
      delete mappings[mappingTypes[0]]._all;
    }
  }

  return mappings;
};

const transformMappings = flow(
  updateFixableMappings,
  validateMappings
);

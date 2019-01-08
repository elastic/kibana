/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { flow, get, omit } from 'lodash';
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

  const settings = transformSettings(indexInfo[indexName].settings);
  const mappings = transformMappings(indexInfo[indexName].mappings);

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
  const delayedTimeout = get(settings, 'index.unassigned.node_left.delayed_timeout');
  if (delayedTimeout && delayedTimeout < 0) {
    settings.index.unassigned.node_left.delayed_timeout = 0;
  }

  return settings;
};

const validateSettings = (settings: any) => {
  if (get(settings, 'index.shard.check_on_startup') === 'fix') {
    throw new Error(`index.shard.check_on_startup cannot be set to 'fix'`);
  }

  if (get(settings, 'index.percolator.map_unmapped_fields_as_string')) {
    throw new Error(`index.percolator.map_unmapped_fields_as_string is not longer supported.`);
  }

  return settings;
};

// Use `flow` to pipe the settings through each function.
const transformSettings = flow(
  removeUnsettableSettings,
  updateFixableSettings,
  validateSettings
);

const validateMappings = (mappings: any) => {
  const mappingTypes = Object.keys(mappings);

  if (mappingTypes.length > 1) {
    throw new Error(`Cannot reindex indices with more than one mapping type.`);
  }

  // _all field not supported.
  if (mappings[mappingTypes[0]] && mappings[mappingTypes[0]]._all) {
    throw new Error(`Cannot reindex indices with _all field.`);
  }

  return mappings;
};

const transformMappings = flow(validateMappings);

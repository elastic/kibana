/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { HINTS_INDEX_NAME } from './constants';
import fleetHintsMapping from './fleet_hints_mapping.json';
export const ensureMapping = async (esClient: ElasticsearchClient) => {
  let existing;

  try {
    existing = await esClient.indices.getMapping({ index: HINTS_INDEX_NAME });
  } catch (e) {
    // do nothing
  }

  if (existing) {
    return;
  }

  return esClient.indices.create({
    index: HINTS_INDEX_NAME,
    ...fleetHintsMapping,
  });
};

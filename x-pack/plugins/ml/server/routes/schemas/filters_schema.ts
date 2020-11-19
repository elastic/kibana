/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const createFilterSchema = schema.object({
  filterId: schema.string(),
  description: schema.maybe(schema.string()),
  items: schema.arrayOf(schema.string()),
});

export const updateFilterSchema = schema.object({
  description: schema.maybe(schema.string()),
  addItems: schema.maybe(schema.arrayOf(schema.string())),
  removeItems: schema.maybe(schema.arrayOf(schema.string())),
});

export const filterIdSchema = schema.object({
  /**
   * ID of the filter
   */
  filterId: schema.string(),
});

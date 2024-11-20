/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { FilteringValues } from './types';

export const getCasesNumberCustomField = () => ({
  isFilterable: false,
  isSortable: false,
  savedObjectMappingType: 'long',
  validateFilteringValues: (values: FilteringValues) => {
    values.forEach((value) => {
      if (value !== null && !Number.isSafeInteger(value)) {
        throw Boom.badRequest('Unsupported filtering value for custom field of type number.');
      }
    });
  },
});

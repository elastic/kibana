/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isBoolean } from 'lodash';

export const getCasesToggleCustomField = () => ({
  isFilterable: true,
  isSortable: false,
  savedObjectMappingType: 'boolean',
  validator: (values: Array<string | number | boolean | null>) => {
    values.forEach((value) => {
      if (value !== null && !isBoolean(value)) {
        throw Boom.badRequest(`The custom field type toggle doesn't have boolean value.`);
      }
    });
  },
});

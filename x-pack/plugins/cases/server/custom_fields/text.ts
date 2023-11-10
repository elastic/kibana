/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isString } from 'lodash';

export const getCasesTextCustomField = () => ({
  isFilterable: false,
  isSortable: false,
  savedObjectMappingType: 'string',
  validator: (values: Array<string | number | boolean | null>) => {
    values.forEach((value) => {
      if (value !== null && !isString(value)) {
        throw Boom.badRequest(`The custom field type text doesn't have string value.`);
      }
    });
  },
});

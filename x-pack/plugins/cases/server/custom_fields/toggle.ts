/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isBoolean } from 'lodash';
import type { CustomFieldValue } from '../../common/types/domain';

export const getCasesToggleCustomField = () => ({
  isFilterable: true,
  isSortable: false,
  savedObjectMappingType: 'boolean',
  validateFilteringValues: (values: CustomFieldValue[]) => {
    values.forEach((value) => {
      if (value !== null && !isBoolean(value)) {
        throw Boom.badRequest(`Unsupported filtering value for custom field of type toggle.`);
      }
    });
  },
  getDefaultValue: () => false,
});

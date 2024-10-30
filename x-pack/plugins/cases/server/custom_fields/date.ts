/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isString } from 'lodash';
import moment from 'moment';
import type { CustomFieldDate } from '../../common/types/domain';

export const getCasesDateCustomField = () => ({
  isFilterable: false,
  isSortable: false,
  savedObjectMappingType: 'date',
  validateFilteringValues: (values: Array<string | CustomFieldDate | number | boolean | null>) => {
    values.forEach((value) => {
      if (value !== null && (!isString(value) || !moment(value, true).isValid())) {
        throw Boom.badRequest(`Unsupported filtering value for custom field of type date.`);
      }
    });
  },
});

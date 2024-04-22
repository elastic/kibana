/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import * as constants from '../../common/constants';

export const smartFields = [
  new DataViewField({
    name: constants.RESOURCE_FIELD,
    type: 'smart_field',
    searchable: false,
    aggregatable: false,
  }),
  new DataViewField({
    name: constants.CONTENT_FIELD,
    type: 'smart_field',
    searchable: false,
    aggregatable: false,
  }),
];

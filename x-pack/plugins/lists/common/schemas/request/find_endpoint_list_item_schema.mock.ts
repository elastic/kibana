/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FILTER } from '../../constants.mock';

import {
  FindEndpointListItemSchemaPartial,
  FindEndpointListItemSchemaPartialDecoded,
} from './find_endpoint_list_item_schema';

export const getFindEndpointListItemSchemaMock = (): FindEndpointListItemSchemaPartial => ({
  filter: FILTER,
  page: '1',
  per_page: '25',
  sort_field: undefined,
  sort_order: undefined,
});

export const getFindEndpointListItemSchemaDecodedMock = (): FindEndpointListItemSchemaPartialDecoded => ({
  filter: FILTER,
  page: 1,
  per_page: 25,
  sort_field: undefined,
  sort_order: undefined,
});

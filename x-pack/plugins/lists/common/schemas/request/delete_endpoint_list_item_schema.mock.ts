/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID } from '../../constants.mock';

import { DeleteEndpointListItemSchema } from './delete_endpoint_list_item_schema';

export const getDeleteEndpointListItemSchemaMock = (): DeleteEndpointListItemSchema => ({
  id: ID,
});

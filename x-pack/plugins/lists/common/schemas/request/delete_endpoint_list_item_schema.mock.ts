/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID } from '../../constants.mock';

import { DeleteEndpointListItemSchema } from './delete_endpoint_list_item_schema';

export const getDeleteEndpointListItemSchemaMock = (): DeleteEndpointListItemSchema => ({
  id: ID,
});

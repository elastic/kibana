/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID, ITEM_ID } from '../../constants.mock';

import { ReadEndpointListItemSchema } from './read_endpoint_list_item_schema';

export const getReadEndpointListItemSchemaMock = (): ReadEndpointListItemSchema => ({
  id: ID,
  item_id: ITEM_ID,
});

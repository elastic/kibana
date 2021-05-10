/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMENTS,
  DESCRIPTION,
  ENDPOINT_ENTRIES,
  ITEM_TYPE,
  META,
  NAME,
  OS_TYPES,
  TAGS,
} from '../../constants.mock';

import { CreateEndpointListItemSchema } from './create_endpoint_list_item_schema';

export const getCreateEndpointListItemSchemaMock = (): CreateEndpointListItemSchema => ({
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENDPOINT_ENTRIES,
  item_id: undefined,
  meta: META,
  name: NAME,
  os_types: OS_TYPES,
  tags: TAGS,
  type: ITEM_TYPE,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COMMENTS,
  DESCRIPTION,
  ENTRIES,
  ID,
  ITEM_TYPE,
  LIST_ITEM_ID,
  META,
  NAME,
  OS_TYPES,
  TAGS,
} from '../../constants.mock';

import { UpdateEndpointListItemSchema } from './update_endpoint_list_item_schema';

export const getUpdateEndpointListItemSchemaMock = (): UpdateEndpointListItemSchema => ({
  _version: undefined,
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENTRIES,
  id: ID,
  item_id: LIST_ITEM_ID,
  meta: META,
  name: NAME,
  os_types: OS_TYPES,
  tags: TAGS,
  type: ITEM_TYPE,
});

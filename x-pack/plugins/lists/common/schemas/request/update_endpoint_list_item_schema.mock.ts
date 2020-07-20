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
  TAGS,
  _TAGS,
} from '../../constants.mock';

import { UpdateEndpointListItemSchema } from './update_endpoint_list_item_schema';

export const getUpdateEndpointListItemSchemaMock = (): UpdateEndpointListItemSchema => ({
  _tags: _TAGS,
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENTRIES,
  id: ID,
  item_id: LIST_ITEM_ID,
  meta: META,
  name: NAME,
  tags: TAGS,
  type: ITEM_TYPE,
});

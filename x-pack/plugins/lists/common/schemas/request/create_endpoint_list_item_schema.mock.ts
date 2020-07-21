/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  COMMENTS,
  DESCRIPTION,
  ENTRIES,
  ITEM_TYPE,
  META,
  NAME,
  TAGS,
  _TAGS,
} from '../../constants.mock';

import { CreateEndpointListItemSchema } from './create_endpoint_list_item_schema';

export const getCreateEndpointListItemSchemaMock = (): CreateEndpointListItemSchema => ({
  _tags: _TAGS,
  comments: COMMENTS,
  description: DESCRIPTION,
  entries: ENTRIES,
  item_id: undefined,
  meta: META,
  name: NAME,
  tags: TAGS,
  type: ITEM_TYPE,
});

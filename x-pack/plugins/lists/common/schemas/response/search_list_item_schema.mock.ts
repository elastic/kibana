/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchListItemSchema } from '../../../common/schemas';
import { VALUE } from '../../../common/constants.mock';

import { getListItemResponseMock } from './list_item_schema.mock';

export const getSearchListItemResponseMock = (): SearchListItemSchema => ({
  items: [getListItemResponseMock()],
  value: VALUE,
});

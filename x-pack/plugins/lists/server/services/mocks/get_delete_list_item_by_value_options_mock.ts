/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeleteListItemByValueOptions } from '../items';

import { getDataClientMock } from './get_data_client_mock';
import { LIST_ID, LIST_ITEM_INDEX, TYPE, VALUE } from './lists_services_mock_constants';

export const getDeleteListItemByValueOptionsMock = (): DeleteListItemByValueOptions => ({
  dataClient: getDataClientMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  type: TYPE,
  value: VALUE,
});

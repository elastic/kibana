/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeleteListOptions } from '../lists';

import { getDataClientMock } from './get_data_client_mock';
import { LISTS_INDEX, LISTS_ITEMS_INDEX, LIST_ID } from './lists_services_mock_constants';

export const getDeleteListOptionsMock = (): DeleteListOptions => ({
  dataClient: getDataClientMock(),
  id: LIST_ID,
  listsIndex: LISTS_INDEX,
  listsItemsIndex: LISTS_ITEMS_INDEX,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UpdateListOptions } from '../lists';

import { getDataClientMock } from './get_data_client_mock';
import {
  DATE_NOW,
  DESCRIPTION,
  LISTS_INDEX,
  LIST_ID,
  META,
  NAME,
  USER,
} from './lists_services_mock_constants';

export const getUpdateListOptionsMock = (): UpdateListOptions => ({
  dataClient: getDataClientMock(),
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  id: LIST_ID,
  listIndex: LISTS_INDEX,
  meta: META,
  name: NAME,
  user: USER,
});

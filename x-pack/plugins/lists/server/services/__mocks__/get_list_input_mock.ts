/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListOptions } from '../lists';

import { getDataClientMock } from './get_data_client_mock';
import {
  DATE_NOW,
  DESCRIPTION,
  LISTS_INDEX,
  LIST_ID,
  NAME,
  USER,
} from './lists_services_mock_constants';

export const getListInputMock = (): CreateListOptions => ({
  dataClient: getDataClientMock(),
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  id: LIST_ID,
  listsIndex: LISTS_INDEX,
  meta: {},
  name: NAME,
  tieBreaker: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
  type: 'ip',
  user: USER,
});

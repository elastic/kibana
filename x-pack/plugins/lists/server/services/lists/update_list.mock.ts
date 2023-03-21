/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  DATE_NOW,
  DESCRIPTION,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  USER,
  VERSION,
} from '../../../common/constants.mock';

import { UpdateListOptions } from '.';

export const getUpdateListOptionsMock = (): UpdateListOptions => ({
  _version: undefined,
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  id: LIST_ID,
  listIndex: LIST_INDEX,
  meta: META,
  name: NAME,
  user: USER,
  version: VERSION,
});

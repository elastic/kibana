/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import {
  DATE_NOW,
  DESCRIPTION,
  IMMUTABLE,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
  VERSION,
} from '../../../common/constants.mock';

import { CreateListOptions } from '.';

export const getCreateListOptionsMock = (): CreateListOptions => ({
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  deserializer: undefined,
  esClient: elasticsearchClientMock.createScopedClusterClient().asCurrentUser,
  id: LIST_ID,
  immutable: IMMUTABLE,
  listIndex: LIST_INDEX,
  meta: META,
  name: NAME,
  serializer: undefined,
  tieBreaker: TIE_BREAKER,
  type: TYPE,
  user: USER,
  version: VERSION,
});

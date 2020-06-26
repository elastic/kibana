/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexEsListSchema } from '../../../common/schemas';
import {
  DATE_NOW,
  DESCRIPTION,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
} from '../../../common/constants.mock';

export const getIndexESListMock = (): IndexEsListSchema => ({
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  deserializer: undefined,
  meta: META,
  name: NAME,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  type: TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
});

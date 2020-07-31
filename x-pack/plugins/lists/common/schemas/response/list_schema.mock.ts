/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListSchema } from '../../../common/schemas';
import {
  DATE_NOW,
  DESCRIPTION,
  IMMUTABLE,
  LIST_ID,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
  VERSION,
} from '../../../common/constants.mock';

export const getListResponseMock = (): ListSchema => ({
  _version: undefined,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  deserializer: undefined,
  id: LIST_ID,
  immutable: IMMUTABLE,
  meta: META,
  name: NAME,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  type: TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
  version: VERSION,
});

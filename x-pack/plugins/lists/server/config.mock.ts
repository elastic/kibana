/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IMPORT_BUFFER_SIZE,
  IMPORT_TIMEOUT,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  MAX_IMPORT_PAYLOAD_BYTES,
  MAX_IMPORT_SIZE,
} from '../common/constants.mock';

import { ConfigType } from './config';

export const getConfigMock = (): Partial<ConfigType> => ({
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
});

export const getConfigMockDecoded = (): ConfigType => ({
  importBufferSize: IMPORT_BUFFER_SIZE,
  importTimeout: IMPORT_TIMEOUT,
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
  maxExceptionsImportSize: MAX_IMPORT_SIZE,
  maxImportPayloadBytes: MAX_IMPORT_PAYLOAD_BYTES,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IMPORT_BUFFER_SIZE,
  LIST_INDEX,
  LIST_ITEM_INDEX,
  MAX_IMPORT_PAYLOAD_BYTES,
} from '../common/constants.mock';

import { ConfigType } from './config';

export const getConfigMock = (): Partial<ConfigType> => ({
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
});

export const getConfigMockDecoded = (): ConfigType => ({
  enabled: true,
  importBufferSize: IMPORT_BUFFER_SIZE,
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
  maxImportPayloadBytes: MAX_IMPORT_PAYLOAD_BYTES,
});

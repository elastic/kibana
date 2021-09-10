/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import { DeserializedHeaders } from '.';
import {
  KBN_SCREENSHOT_HEADER_BLOCK_LIST,
  KBN_SCREENSHOT_HEADER_BLOCK_LIST_STARTS_WITH_PATTERN,
} from '../../../common/constants';

export const omitBlockedHeaders = (decryptedHeaders: DeserializedHeaders) => {
  const filteredHeaders: DeserializedHeaders = omitBy(
    decryptedHeaders,
    (_value, header: string) =>
      header &&
      (KBN_SCREENSHOT_HEADER_BLOCK_LIST.includes(header) ||
        KBN_SCREENSHOT_HEADER_BLOCK_LIST_STARTS_WITH_PATTERN.some((pattern) =>
          header?.startsWith(pattern)
        ))
  );
  return filteredHeaders;
};

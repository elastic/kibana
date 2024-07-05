/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * This option is also useful for protecting against Lucene’s term byte-length limit of 32766.
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/ignore-above.html
 */
const MAX_BYTE_LENGTH = 32766;

/**
 * validates ES keyword type
 *
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/ignore-above.html
 * This option is also useful for protecting against Lucene’s term byte-length limit of 32766.
 */
export const isValidKeyword = (value: SearchTypes, ignoreAbove?: number): boolean => {
  // Keyword value must be a string
  if (typeof value !== 'string') {
    return false;
  }
  // If `ignore_above` is specified we can safely save text of any size in the keyword field,
  // thus we count passed value to be a keyword compliant
  if (ignoreAbove != null) {
    return true;
  }
  return Buffer.byteLength(value, 'utf8') <= MAX_BYTE_LENGTH;
};

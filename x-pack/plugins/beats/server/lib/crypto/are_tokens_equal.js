/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timingSafeEqual } from 'crypto';

export function areTokensEqual(token1, token2) {
  return token1.length === token2.length
    && timingSafeEqual(Buffer.from(token1, 'utf8'), Buffer.from(token2, 'utf8'));
}

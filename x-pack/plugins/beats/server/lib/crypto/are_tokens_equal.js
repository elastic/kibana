/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timingSafeEqual } from 'crypto';

const RANDOM_TOKEN_1 = 'b48c4bda384a40cb91c6eb9b8849e77f';
const RANDOM_TOKEN_2 = '80a3819e3cd64f4399f1d4886be7a08b';

export function areTokensEqual(token1, token2) {
  if ((typeof token1 !== 'string') || (typeof token2 !== 'string') || (token1.length !== token2.length)) {
    // This prevents a more subtle timing attack where we know already the tokens aren't going to
    // match but still we don't return fast. Instead we compare two pre-generated random tokens using
    // the same comparison algorithm that we would use to compare two equal-length tokens.
    return timingSafeEqual(Buffer.from(RANDOM_TOKEN_1, 'utf8'), Buffer.from(RANDOM_TOKEN_2, 'utf8'));
  }

  return timingSafeEqual(Buffer.from(token1, 'utf8'), Buffer.from(token2, 'utf8'));
}

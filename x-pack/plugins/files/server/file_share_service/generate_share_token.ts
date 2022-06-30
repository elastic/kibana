/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';

/**
 * This code is adapted and borrowed from
 * https://github.com/sindresorhus/crypto-random-string/blob/25f8930282bc3803d03b9080e710db8426430b63/core.js
 */

const CHAR_SET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CHAR_SET_LENGTH = CHAR_SET.length;

// We are going to read as 16 bits numbers at a time which means this is the largest
// number we are going to see.
const MAX_16_BIT_INT = Math.pow(2, 16) - 1; // OR 0x10000 - 1

// The biggest number we can use for modulo given the charset to ensure good distribution
// This number works because we know CHAR_SET_LENGTH fits into it CHAR_SET_LENGTH number of times
const MAX_USABLE_VALUE = Math.floor(MAX_16_BIT_INT / CHAR_SET_LENGTH) * CHAR_SET_LENGTH;

// Tokens must be 40 chars long
const TOKEN_LENGTH = 40;
// How much entropy we will generate for each pass
const ENTROPY_LENGTH = 2 * Math.floor(1.1 * TOKEN_LENGTH);

/**
 * Generate 40 random characters of a pre-checked charset for share tokens.
 *
 * Samples:
 *
 * XBWUuHRZsxXZgS03VUp2hSifmCoF4zznsNOehTea
 * 40RIzynCs2OFTkYC2fy9vfLgYhxjmwzYrJvGj2Ih
 * ZFM1vFSz6k8k9QU4Ve5mu0PbcBi3rwV4BykbcrDU
 * 2oweE4dmWT7warVYA59l0thCDWnIMvUsAC9yCWyQ
 * q8R4LneRCBhcsCNKgcebZRh1Mh4m746GNTuifmAA
 * kpUzKyynu8uXDtek2Xg5yJRwPkw37Cd1VaUezNZ2
 */
export function generateShareToken(): string {
  let token = '';
  while (token.length < TOKEN_LENGTH) {
    // It is highly unlikely we will call this function more than once per token
    const entropy = crypto.randomBytes(ENTROPY_LENGTH);
    let entropyPointer = 0;
    while (entropyPointer < entropy.length && token.length < TOKEN_LENGTH) {
      const value = entropy.readUInt16LE(entropyPointer);
      entropyPointer += 2; // Move ahead 2 bytes to the next number
      if (value > MAX_USABLE_VALUE) continue;
      token += CHAR_SET[value % CHAR_SET_LENGTH];
    }
  }
  return token;
}

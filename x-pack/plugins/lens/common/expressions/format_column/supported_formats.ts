/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const supportedFormats: Record<
  string,
  { decimalsToPattern: (decimals?: number) => string; formatId: string }
> = {
  number: {
    formatId: 'number',
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0`;
      }
      return `0,0.${'0'.repeat(decimals)}`;
    },
  },
  percent: {
    formatId: 'percent',
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0%`;
      }
      return `0,0.${'0'.repeat(decimals)}%`;
    },
  },
  bytes: {
    formatId: 'bytes',
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0b`;
      }
      return `0,0.${'0'.repeat(decimals)}b`;
    },
  },
  bits: {
    formatId: 'number',
    decimalsToPattern: (decimals = 2) => {
      if (decimals === 0) {
        return `0,0bitd`;
      }
      return `0,0.${'0'.repeat(decimals)}bitd`;
    },
  },
};

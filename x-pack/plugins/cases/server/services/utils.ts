/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from 'io-ts';
import { decodeOrThrow } from '../../common/api';

export const bulkDecodeSOAttributes = <T>(
  savedObjects: Array<{ id: string; attributes: T }>,
  type: Type<T>
) => {
  const decodeRes = new Map<string, T>();

  for (const so of savedObjects) {
    decodeRes.set(so.id, decodeOrThrow(type)(so.attributes));
  }

  return decodeRes;
};

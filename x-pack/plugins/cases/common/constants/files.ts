/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Operation, Owner } from './types';

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MiB

export const constructHttpOperationTag = (owner: Owner, operation: Operation) => {
  return `${owner}FilesCases${operation}`;
};

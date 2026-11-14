/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import { normalizeTailSamplingConfig } from '../../../../common/tail_sampling';

// Hashes the normalized policies, so field order does not change the hash.
export function getPoliciesHash(policies: unknown[]): string {
  return createHash('sha256')
    .update(JSON.stringify(normalizeTailSamplingConfig(policies)))
    .digest('hex');
}

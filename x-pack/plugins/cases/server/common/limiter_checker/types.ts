/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequest } from '../../../common/types/api';

export interface Limiter {
  readonly limit: number;
  readonly errorMessage: string;
  countOfItemsWithinCase(caseId: string): Promise<number>;
  countOfItemsInRequest: (requests: AttachmentRequest[]) => number;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentRequest, CommentType } from '../../../common/api';
import type { Limiter } from './types';

interface LimiterParams {
  limit: number;
  attachmentType: CommentType | CommentType[];
  field?: string;
  attachmentNoun: string;
}

export abstract class BaseLimiter implements Limiter {
  public readonly limit: number;
  public readonly errorMessage: string;

  constructor(params: LimiterParams) {
    this.limit = params.limit;
    this.errorMessage = makeErrorMessage(this.limit, params.attachmentNoun);
  }

  public abstract countOfItemsWithinCase(caseId: string): Promise<number>;
  public abstract countOfItemsInRequest(requests: CommentRequest[]): number;
}

const makeErrorMessage = (limit: number, noun: string) => {
  return `Case has reached the maximum allowed number (${limit}) of attached ${noun}.`;
};

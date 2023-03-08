/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KueryNode } from '@kbn/es-query';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import type { CommentRequest, CommentType } from '../../../common/api';
import type { AttachmentService } from '../../services';
import type { Limiter } from './types';

interface LimiterParams {
  limit: number;
  attachmentType: CommentType;
  field: string;
  attachmentNoun: string;
  filter?: KueryNode;
}

export abstract class BaseLimiter implements Limiter {
  public readonly limit: number;
  public readonly errorMessage: string;

  private readonly limitAggregation: Record<string, estypes.AggregationsAggregationContainer>;
  private readonly params: LimiterParams;

  constructor(params: LimiterParams) {
    this.params = params;
    this.limit = params.limit;
    this.errorMessage = makeErrorMessage(this.limit, params.attachmentNoun);

    this.limitAggregation = {
      limiter: {
        value_count: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.${params.field}`,
        },
      },
    };
  }

  public async countOfItemsWithinCase(
    attachmentService: AttachmentService,
    caseId: string
  ): Promise<number> {
    const itemsAttachedToCase = await attachmentService.executeCaseAggregations<{
      limiter: { value: number };
    }>({
      caseId,
      aggregations: this.limitAggregation,
      attachmentType: this.params.attachmentType,
      filter: this.params.filter,
    });

    return itemsAttachedToCase?.limiter?.value ?? 0;
  }

  public abstract countOfItemsInRequest(requests: CommentRequest[]): number;
}

const makeErrorMessage = (limit: number, noun: string) => {
  return `Case has reached the maximum allowed number (${limit}) of attached ${noun}.`;
};

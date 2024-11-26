/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePersistedStatus } from '../../../../common/types/case';
import { caseStatuses } from '../../../../../common/types/domain';
import { CASE_SAVED_OBJECT } from '../../../../../common/constants';
import type { CasesMetricsResponse } from '../../../../../common/types/api';
import type { AggregationBuilder, AggregationResponse } from '../../types';

export class StatusCounts implements AggregationBuilder<CasesMetricsResponse> {
  build() {
    return {
      status: {
        terms: {
          field: `${CASE_SAVED_OBJECT}.attributes.status`,
          size: caseStatuses.length,
        },
      },
    };
  }

  formatResponse(aggregations: AggregationResponse) {
    const aggs = aggregations as StatusAggregate;
    const buckets = aggs?.status?.buckets ?? [];
    const status: Partial<Record<CasePersistedStatus, number>> = {};

    for (const bucket of buckets) {
      status[bucket.key] = bucket.doc_count;
    }

    return {
      status: {
        open: status[CasePersistedStatus.OPEN] ?? 0,
        inProgress: status[CasePersistedStatus.IN_PROGRESS] ?? 0,
        closed: status[CasePersistedStatus.CLOSED] ?? 0,
      },
    };
  }

  getName() {
    return 'status';
  }
}

type StatusAggregate = StatusAggregateResponse | undefined;

interface StatusAggregateResponse {
  status: {
    buckets: Array<{
      key: CasePersistedStatus;
      doc_count: number;
    }>;
  };
}

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

    const open = buckets.find(({ key }) => key === CasePersistedStatus.OPEN);
    const inProgress = buckets.find(({ key }) => key === CasePersistedStatus.IN_PROGRESS);
    const closed = buckets.find(({ key }) => key === CasePersistedStatus.CLOSED);

    return {
      status: {
        open: open?.doc_count ?? 0,
        inProgress: inProgress?.doc_count ?? 0,
        closed: closed?.doc_count ?? 0,
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
      key: number;
      doc_count: number;
    }>;
  };
}

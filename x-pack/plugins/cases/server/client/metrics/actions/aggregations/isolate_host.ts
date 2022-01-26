/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IsolateHostActionType } from '../../../../../common/api';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../../../common/constants';
import { AggregationBuilder, AggregationResponse } from '../../types';

interface ActionsAggregation {
  actions?: {
    buckets: Array<{ key: string; doc_count: number }>;
  };
}
type ActionsAggregationResponse = ActionsAggregation | undefined;

export class IsolateHostActions implements AggregationBuilder {
  // uniqueValuesLimit should not be lower than the number of actions.type values (currently 2) or some information could be lost
  constructor(private readonly uniqueValuesLimit: number = 10) {}

  build() {
    return {
      actions: {
        terms: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.actions.type`,
          size: this.uniqueValuesLimit,
        },
      },
    };
  }

  formatResponse(aggregationsResponse: AggregationResponse) {
    const aggs = aggregationsResponse as ActionsAggregationResponse;
    const actionsCounters = aggs?.actions?.buckets.reduce<Record<string, number>>(
      (result, { key, doc_count: total }) => ({ ...result, [key]: total }),
      {}
    );
    return {
      actions: {
        isolateHost: {
          [IsolateHostActionType.isolate]: {
            total: actionsCounters?.[IsolateHostActionType.isolate] ?? 0,
          },
          [IsolateHostActionType.unisolate]: {
            total: actionsCounters?.[IsolateHostActionType.unisolate] ?? 0,
          },
        },
      },
    };
  }

  getName() {
    return 'isolateHost';
  }
}

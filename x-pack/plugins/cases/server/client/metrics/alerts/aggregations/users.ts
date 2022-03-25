/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationBuilder, AggregationResponse } from '../../types';

export class AlertUsers implements AggregationBuilder {
  constructor(private readonly uniqueValuesLimit: number = 10) {}

  build() {
    return {
      users_frequency: {
        terms: {
          field: userName,
          size: this.uniqueValuesLimit,
        },
      },
      users_total: {
        cardinality: {
          field: userName,
        },
      },
    };
  }

  formatResponse(aggregations: AggregationResponse) {
    const aggs = aggregations as UsersAggregate;

    const topFrequentUsers = aggs?.users_frequency?.buckets.map((bucket) => ({
      name: bucket.key,
      count: bucket.doc_count,
    }));

    const totalUsers = aggs?.users_total?.value;

    const usersFields =
      topFrequentUsers && totalUsers
        ? { total: totalUsers, values: topFrequentUsers }
        : { total: 0, values: [] };

    return { alerts: { users: usersFields } };
  }

  getName() {
    return 'users';
  }
}

const userName = 'user.name';

type UsersAggregate = UsersAggregateResponse | undefined;

interface UsersAggregateResponse {
  users_frequency?: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  users_total?: {
    value: number;
  };
}

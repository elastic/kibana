/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AggregationBuilder, AggregationResponse } from '../../types';

type HostsAggregate = HostsAggregateResponse | undefined;

interface HostsAggregateResponse {
  hosts_frequency?: {
    buckets: FieldAggregateBucket[];
  };
  hosts_total?: {
    value: number;
  };
}

interface FieldAggregateBucket {
  key: string;
  doc_count: number;
  top_fields: estypes.AggregationsTopHitsAggregate;
}

const hostName = 'host.name';
const hostId = 'host.id';

export class AlertHosts implements AggregationBuilder {
  constructor(private readonly uniqueValuesLimit: number = 10) {}

  build() {
    const topHits: estypes.AggregationsAggregationContainer = {
      aggs: {
        top_fields: {
          top_hits: {
            docvalue_fields: [hostName],
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
            size: 1,
          },
        },
      },
    };

    return {
      hosts_frequency: {
        terms: {
          field: hostId,
          size: this.uniqueValuesLimit,
        },
        ...topHits,
      },
      hosts_total: {
        cardinality: {
          field: hostId,
        },
      },
    };
  }

  formatResponse(aggregations: AggregationResponse) {
    const aggs = aggregations as HostsAggregate;

    const topFrequentHosts = aggs?.hosts_frequency?.buckets.map((bucket) => ({
      name: AlertHosts.getHostName(bucket),
      id: bucket.key,
      count: bucket.doc_count,
    }));

    const totalHosts = aggs?.hosts_total?.value;

    const hostFields =
      topFrequentHosts && totalHosts
        ? { total: totalHosts, values: topFrequentHosts }
        : { total: 0, values: [] };

    return { alerts: { hosts: hostFields } };
  }

  private static getHostName(bucket: FieldAggregateBucket) {
    const unsafeHostName = get(bucket.top_fields.hits.hits[0].fields, hostName);

    if (Array.isArray(unsafeHostName) && unsafeHostName.length > 0) {
      return unsafeHostName[0];
    }
    return unsafeHostName;
  }

  getName() {
    return 'hosts';
  }
}

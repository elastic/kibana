/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { set } from '@elastic/safer-lodash-set';
import { calculateTimeSeriesInterval } from '../../../../../utils/build_query';
import { MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy/security_solution/matrix_histogram';
import { buildDnsQuery } from '../../network/dns/query.dns_network.dsl';
import { Direction, NetworkDnsFields } from '../../../../../../common/search_strategy';

export const buildDnsHistogramQuery = ({
  filterQuery,
  timerange,
  defaultIndex,
  stackByField,
}: MatrixHistogramRequestOptions) => {
  const { from, to } = timerange;

  const getHistogramAggregation = () => {
    const interval = calculateTimeSeriesInterval(from, to);
    const histogramTimestampField = '@timestamp';

    return {
      date_histogram: {
        field: histogramTimestampField,
        fixed_interval: interval,
        min_doc_count: 0,
        extended_bounds: {
          min: moment(from).valueOf(),
          max: moment(to).valueOf(),
        },
      },
    };
  };

  const dnsHistogramQuery = buildDnsQuery({
    defaultIndex,
    filterQuery,
    isPtrIncluded: false,
    stackByField,
    timerange,
    pagination: {
      cursorStart: 0,
    },
    sort: { field: NetworkDnsFields.queryCount, direction: Direction.desc },
  });

  return set(
    dnsHistogramQuery,
    'body.aggregations.dns_name_query_count.aggs.dns_question_name',
    getHistogramAggregation()
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { MatrixHistogramOverTimeData, HistogramType } from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';
import { MatrixHistogramAdapter, MatrixHistogramDataConfig, MatrixHistogramHit } from './types';
import { TermAggregation } from '../types';
import { buildAnomaliesOverTimeQuery } from './query.anomalies_over_time.dsl';
import { buildDnsHistogramQuery } from './query_dns_histogram.dsl';
import { buildEventsOverTimeQuery } from './query.events_over_time.dsl';
import { getDnsParsedData, getGenericData } from './utils';
import { buildAuthenticationsOverTimeQuery } from './query.authentications_over_time.dsl';
import { buildAlertsHistogramQuery } from './query_alerts.dsl';

const matrixHistogramConfig: MatrixHistogramDataConfig = {
  [HistogramType.alerts]: {
    buildDsl: buildAlertsHistogramQuery,
    aggName: 'aggregations.alertsGroup.buckets',
    parseKey: 'alerts.buckets',
  },
  [HistogramType.anomalies]: {
    buildDsl: buildAnomaliesOverTimeQuery,
    aggName: 'aggregations.anomalyActionGroup.buckets',
    parseKey: 'anomalies.buckets',
  },
  [HistogramType.authentications]: {
    buildDsl: buildAuthenticationsOverTimeQuery,
    aggName: 'aggregations.eventActionGroup.buckets',
    parseKey: 'events.buckets',
  },
  [HistogramType.dns]: {
    buildDsl: buildDnsHistogramQuery,
    aggName: 'aggregations.NetworkDns.buckets',
    parseKey: 'dns.buckets',
    parser: getDnsParsedData,
  },
  [HistogramType.events]: {
    buildDsl: buildEventsOverTimeQuery,
    aggName: 'aggregations.eventActionGroup.buckets',
    parseKey: 'events.buckets',
  },
};

export class ElasticsearchMatrixHistogramAdapter implements MatrixHistogramAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getHistogramData(
    request: FrameworkRequest,
    options: MatrixHistogramRequestOptions
  ): Promise<MatrixHistogramOverTimeData> {
    const myConfig = getOr(null, options.histogramType, matrixHistogramConfig);
    if (myConfig == null) {
      throw new Error(`This histogram type ${options.histogramType} is unknown to the server side`);
    }
    const dsl = myConfig.buildDsl(options);
    const response = await this.framework.callWithRequest<
      MatrixHistogramHit<HistogramType>,
      TermAggregation
    >(request, 'search', dsl);
    const totalCount = getOr(0, 'hits.total.value', response);
    const matrixHistogramData = getOr([], myConfig.aggName, response);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
      matrixHistogramData: myConfig.parser
        ? myConfig.parser<typeof options.histogramType>(matrixHistogramData, myConfig.parseKey)
        : getGenericData<typeof options.histogramType>(matrixHistogramData, myConfig.parseKey),
      totalCount,
    };
  }
}

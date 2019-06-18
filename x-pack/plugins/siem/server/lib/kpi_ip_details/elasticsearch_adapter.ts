/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiIpDetailsData, KpiIpDetailsHistogramData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';

import { buildGeneralQuery } from './query_general.dsl';

import { KpiIpDetailsAdapter, KpiIpDetailsESMSearchBody, KpiIpDetailsHit } from './types';
import { IpOverviewRequestOptions } from '../ip_details';

const formatHistogramData = (
  data: Array<{ key: string; count: { value: number } }>
): KpiIpDetailsHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiIpDetailsHistogramData>(({ key, count }) => {
        return {
          x: key,
          y: getOr(null, 'value', count),
        };
      })
    : null;
};

export class ElasticsearchKpiIpDetailsAdapter implements KpiIpDetailsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiIpDetails(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<KpiIpDetailsData> {
    const generalQuery: KpiIpDetailsESMSearchBody[] = buildGeneralQuery(options);
    const response = await this.framework.callWithRequest<KpiIpDetailsHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [...generalQuery],
      }
    );
    const sourcePacketsHistogram = getOr(
      null,
      'responses.0.aggregations.source.packetsHistogram.buckets',
      response
    );
    const destinationPacketsHistogram = getOr(
      null,
      'responses.0.aggregations.destination.packetsHistogram.buckets',
      response
    );
    const sourceByteHistogram = getOr(
      null,
      'responses.0.aggregations.source.bytesHistogram.buckets',
      response
    );
    const destinationByteHistogram = getOr(
      null,
      'responses.0.aggregations.destination.bytesHistogram.buckets',
      response
    );

    return {
      connections: getOr(null, 'responses.0.hits.total.value', response),
      hosts: getOr(null, 'responses.0.aggregations.destination.hosts.value', response),
      sourcePackets: getOr(null, 'responses.0.aggregations.source.packets.value', response),
      sourcePacketsHistogram: formatHistogramData(sourcePacketsHistogram),
      destinationPackets: getOr(
        null,
        'responses.0.aggregations.destination.packets.value',
        response
      ),
      destinationPacketsHistogram: formatHistogramData(destinationPacketsHistogram),
      sourceByte: getOr(null, 'responses.0.aggregations.source.bytes.value', response),
      sourceByteHistogram: formatHistogramData(sourceByteHistogram),
      destinationByte: getOr(null, 'responses.0.aggregations.destination.bytes.value', response),
      destinationByteHistogram: formatHistogramData(destinationByteHistogram),
    };
  }
}

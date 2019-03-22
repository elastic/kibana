/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IpOverviewData } from '../../graphql/types';
import { DatabaseSearchResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';

import { IpOverviewRequestOptions } from './index';
import { buildQuery } from './query.dsl';
import { GenericBuckets, IpOverviewAdapter, IpOverviewHit } from './types';

export class ElasticsearchIpOverviewAdapter implements IpOverviewAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIpOverview(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    // console.log('ES Query:');
    // console.log(JSON.stringify(buildQuery(options), null, 2));

    const response = await this.framework.callWithRequest<IpOverviewHit, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    // console.log('ES Response:');
    // console.log(JSON.stringify(response, null, 2));

    const r = {
      ...getIpOverviewAgg('source', response),
      ...getIpOverviewAgg('destination', response),
    };

    // console.log('GQL Response:');
    // console.log(JSON.stringify(r, null, 2));

    return r;
  }
}

const getIpOverviewAgg = (
  type: string,
  response: DatabaseSearchResponse<IpOverviewHit, TermAggregation>
) => {
  // const sourceTotal = getOr(null, 'aggregations.source.doc_count', response);
  const firstSeen = getOr(null, `aggregations.${type}.firstSeen.value_as_string`, response);
  const lastSeen = getOr(null, `aggregations.${type}.firstSeen.value_as_string`, response);
  const geoFields = getOr(
    null,
    `aggregations.${type}.geo.results.hits.hits[0]._source.${type}.geo`,
    response
  );
  const hostFields = getOr(
    null,
    `aggregations.${type}.host.results.hits.hits[0]._source.host`,
    response
  );
  const domains = getOr([], `aggregations.${type}.domains.buckets`, response).map(
    (d: GenericBuckets) => d.key
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      domains: {
        ...domains,
      },
      host: {
        ...hostFields,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};

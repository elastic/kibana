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
    const response = await this.framework.callWithRequest<IpOverviewHit, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    return {
      ...getIpOverviewAgg('source', response),
      ...getIpOverviewAgg('destination', response),
    };
  }
}

const getIpOverviewAgg = (
  type: string,
  response: DatabaseSearchResponse<IpOverviewHit, TermAggregation>
) => {
  const firstSeen = getOr(null, `aggregations.${type}.firstSeen.value_as_string`, response);
  const lastSeen = getOr(null, `aggregations.${type}.lastSeen.value_as_string`, response);

  const autonomousSystem = getOr(
    null,
    `aggregations.${type}.autonomousSystem.results.hits.hits[0]._source.autonomous_system`,
    response
  );
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
    (b: GenericBuckets) => ({
      name: b.key,
      count: b.doc_count,
      lastSeen: b.timestamp.value_as_string,
    })
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      autonomousSystem: {
        ...autonomousSystem,
      },
      domains: [...domains],
      host: {
        ...hostFields,
      },
      geo: {
        ...geoFields,
      },
    },
  };
};

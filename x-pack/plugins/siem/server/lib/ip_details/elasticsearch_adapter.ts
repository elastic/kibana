/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import {
  AutonomousSystem,
  DomainsData,
  GeoEcsFields,
  HostEcsFields,
  IpOverviewData,
} from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';

import { DomainsRequestOptions, IpOverviewRequestOptions } from './index';
import { buildQuery } from './query.dsl';
import { IpDetailsAdapter, IpOverviewHit, OverviewHit } from './types';

export class ElasticsearchIpOverviewAdapter implements IpDetailsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIpDetails(
    request: FrameworkRequest,
    options: IpOverviewRequestOptions
  ): Promise<IpOverviewData> {
    const response = await this.framework.callWithRequest<IpOverviewHit, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    return {
      ...getIpOverviewAgg('source', getOr({}, 'aggregations.source', response)),
      ...getIpOverviewAgg('destination', getOr({}, 'aggregations.destination', response)),
    };
  }

  public async getDomains(
    request: FrameworkRequest,
    options: DomainsRequestOptions
  ): Promise<DomainsData> {
    return {
      domain_name: 'hiii2',
    };
  }
}

export const getIpOverviewAgg = (type: string, overviewHit: OverviewHit | {}) => {
  const firstSeen = getOr(null, `firstSeen.value_as_string`, overviewHit);
  const lastSeen = getOr(null, `lastSeen.value_as_string`, overviewHit);

  const autonomousSystem: AutonomousSystem | null = getOr(
    null,
    `autonomousSystem.results.hits.hits[0]._source.autonomous_system`,
    overviewHit
  );
  const geoFields: GeoEcsFields | null = getOr(
    null,
    `geo.results.hits.hits[0]._source.${type}.geo`,
    overviewHit
  );
  const hostFields: HostEcsFields | null = getOr(
    null,
    `host.results.hits.hits[0]._source.host`,
    overviewHit
  );

  return {
    [type]: {
      firstSeen,
      lastSeen,
      autonomousSystem: {
        ...autonomousSystem,
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

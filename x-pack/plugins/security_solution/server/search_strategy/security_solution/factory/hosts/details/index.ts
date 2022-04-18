/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { IScopedClusterClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import {
  HostAggEsData,
  HostDetailsStrategyResponse,
  HostsQueries,
  HostDetailsRequestOptions,
  EndpointFields,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildHostDetailsQuery } from './query.host_details.dsl';
import { formatHostItem, getHostEndpoint } from './helpers';
import { EndpointAppContext } from '../../../../../endpoint/types';

export const hostDetails: SecuritySolutionFactory<HostsQueries.details> = {
  buildDsl: (options: HostDetailsRequestOptions) => buildHostDetailsQuery(options),
  parse: async (
    options: HostDetailsRequestOptions,
    response: IEsSearchResponse<HostAggEsData>,
    deps?: {
      esClient: IScopedClusterClient;
      savedObjectsClient: SavedObjectsClientContract;
      endpointContext: EndpointAppContext;
      request: KibanaRequest;
    }
  ): Promise<HostDetailsStrategyResponse> => {
    const aggregations = get('aggregations', response.rawResponse);

    const inspect = {
      dsl: [inspectStringifyObject(buildHostDetailsQuery(options))],
    };

    if (aggregations == null) {
      return { ...response, inspect, hostDetails: {} };
    }

    const formattedHostItem = formatHostItem(aggregations);
    const ident = // endpoint-generated ID, NOT elastic-agent-id
      formattedHostItem.endpoint && formattedHostItem.endpoint.id
        ? Array.isArray(formattedHostItem.endpoint.id)
          ? formattedHostItem.endpoint.id[0]
          : formattedHostItem.endpoint.id
        : null;
    if (deps == null) {
      return { ...response, inspect, hostDetails: { ...formattedHostItem } };
    }
    const endpoint: EndpointFields | null = await getHostEndpoint(ident, deps);
    return {
      ...response,
      inspect,
      hostDetails: endpoint != null ? { ...formattedHostItem, endpoint } : formattedHostItem,
    };
  },
};

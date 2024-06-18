/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  HostAggEsData,
  HostDetailsStrategyResponse,
  HostsQueries,
  EndpointFields,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildHostDetailsQuery } from './query.host_details.dsl';
import { formatHostItem, getHostEndpoint } from './helpers';
import type { EndpointAppContext } from '../../../../../endpoint/types';

export const hostDetails: SecuritySolutionFactory<HostsQueries.details> = {
  buildDsl: (options) => buildHostDetailsQuery(options),
  parse: async (
    options,
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
        ? formattedHostItem.endpoint.id[0]
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

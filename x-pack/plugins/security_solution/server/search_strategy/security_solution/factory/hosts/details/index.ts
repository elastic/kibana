/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  HostAggEsData,
  HostAggEsItem,
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
import {
  ILegacyScopedClusterClient,
  SavedObjectsClientContract,
} from '../../../../../../../../../src/core/server';

export const hostDetails: SecuritySolutionFactory<HostsQueries.details> = {
  buildDsl: (options: HostDetailsRequestOptions) => buildHostDetailsQuery(options),
  parse: async (
    options: HostDetailsRequestOptions,
    response: IEsSearchResponse<HostAggEsData>,
    deps: {
      esLegacyClient: ILegacyScopedClusterClient;
      savedObjectsClient: SavedObjectsClientContract;
      endpointContext: EndpointAppContext;
    }
  ): Promise<HostDetailsStrategyResponse> => {
    const aggregations: HostAggEsItem = get('aggregations', response.rawResponse) || {};
    console.log('-------------');
    console.log(JSON.stringify(response.rawResponse));
    const inspect = {
      dsl: [inspectStringifyObject(buildHostDetailsQuery(options))],
    };
    const formattedHostItem = formatHostItem(options.fields, aggregations);
    const ident = // endpoint-generated ID, NOT elastic-agent-id
      formattedHostItem.agent && formattedHostItem.agent.id
        ? Array.isArray(formattedHostItem.agent.id)
          ? formattedHostItem.agent.id[0]
          : formattedHostItem.agent.id
        : null;
    const endpoint: EndpointFields | null = await getHostEndpoint(ident, deps);
    return { inspect, _id: options.hostName, ...formattedHostItem };
  },
};

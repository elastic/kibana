/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWrappableRequest } from '../../lib/adapters/framework';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getGroupings } from './lib/get_groupings';
import { MetricsExplorerRequest, MetricsExplorerResponse } from './types';

export const initMetricExplorerRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  const { callWithRequest } = framework;

  framework.registerRoute<
    InfraWrappableRequest<MetricsExplorerRequest>,
    Promise<MetricsExplorerResponse>
  >({
    method: 'POST',
    path: '/api/infra/metrics_explorer',
    handler: async req => {
      const search = <Aggregation>(searchOptions: object) =>
        callWithRequest<{}, Aggregation>(req, 'search', searchOptions);
      const response = await getGroupings(search, req.payload);
      return response;
    },
  });
};

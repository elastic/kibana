/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getGroupings } from './lib/get_groupings';
import { populateSeriesWithTSVBData } from './lib/populate_series_with_tsvb_data';
import { metricsExplorerSchema } from './schema';
import { MetricsExplorerResponse, MetricsExplorerWrappedRequest } from './types';

export const initMetricExplorerRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  const { callWithRequest } = framework;

  framework.registerRoute<MetricsExplorerWrappedRequest, Promise<MetricsExplorerResponse>>({
    method: 'POST',
    path: '/api/infra/metrics_explorer',
    options: {
      validate: {
        payload: metricsExplorerSchema,
      },
    },
    handler: async req => {
      try {
        const search = <Aggregation>(searchOptions: object) =>
          callWithRequest<{}, Aggregation>(req, 'search', searchOptions);
        const options = req.payload;
        // First we get the groupings from a composite aggregation
        const response = await getGroupings(search, options);
        // Then we take the results and fill in the data from TSVB with the
        // user's custom metrics
        const seriesWithMetrics = await Promise.all(
          response.series.map(populateSeriesWithTSVBData(req, options, framework))
        );
        return { ...response, series: seriesWithMetrics };
      } catch (error) {
        throw boomify(error);
      }
    },
  });
};

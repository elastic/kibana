/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsAPIRequest, MetricsAPIResponse } from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';
import { query } from '../../../lib/metrics';

const handleResponse =
  (client: ESSearchClient, options: MetricsAPIRequest, previousResponse?: MetricsAPIResponse) =>
  async (resp: MetricsAPIResponse): Promise<MetricsAPIResponse> => {
    const combinedResponse = previousResponse
      ? {
          ...previousResponse,
          series: [...previousResponse.series, ...resp.series],
          info: resp.info,
        }
      : resp;
    if (resp.info.afterKey) {
      return query(client, { ...options, afterKey: resp.info.afterKey }).then(
        handleResponse(client, options, combinedResponse)
      );
    }
    return combinedResponse;
  };

export const queryAllData = (client: ESSearchClient, options: MetricsAPIRequest) => {
  return query(client, options).then(handleResponse(client, options));
};

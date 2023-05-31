/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart, HttpHandler } from '@kbn/core/public';
import { Parameters } from '@storybook/react';
import { INFA_ML_GET_METRICS_HOSTS_ANOMALIES_PATH } from '../../../../../common/http_api/infra_ml';
import { metadataHttpResponse, type MetadataResponseMocks } from './fixtures/metadata';
import { processesHttpResponse, type ProcessesHttpMocks } from './fixtures/processes';
import { anomaliesHttpResponse, type AnomaliesHttpMocks } from './fixtures/anomalies';

export const getHttp = (params: Parameters): HttpStart => {
  const http = {
    basePath: {
      prepend: (_path: string) => {
        return '';
      },
    },
    get: (async (path: string) => {
      switch (path) {
        case '/internal/osquery/privileges_check':
          return Promise.resolve(true);
        default:
          return Promise.resolve({});
      }
    }) as HttpHandler,
    fetch: (async (path: string) => {
      switch (path) {
        case '/api/metrics/process_list':
          return processesHttpResponse[params.mock as ProcessesHttpMocks]();
        case '/api/infra/metadata':
          return metadataHttpResponse[params.mock as MetadataResponseMocks]();
        case INFA_ML_GET_METRICS_HOSTS_ANOMALIES_PATH:
          return anomaliesHttpResponse[params.mock as AnomaliesHttpMocks]();
        default:
          return Promise.resolve({});
      }
    }) as HttpHandler,
  };

  return http as unknown as HttpStart;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useTimeSeriesExplorerHref } from './useTimeSeriesExplorerHref';

jest.mock('../../../../hooks/useApmPluginContext', () => ({
  useApmPluginContext: () => ({
    core: { http: { basePath: { prepend: (url: string) => url } } },
  }),
}));

jest.mock('../../../../hooks/useLocation', () => ({
  useLocation: () => ({
    search:
      '?rangeFrom=2020-07-29T17:27:29.000Z&rangeTo=2020-07-29T18:45:00.000Z&refreshInterval=10000&refreshPaused=true',
  }),
}));

describe('useTimeSeriesExplorerHref', () => {
  it('correctly encodes time range values', async () => {
    const href = useTimeSeriesExplorerHref({
      jobId: 'apm-production-485b-high_mean_transaction_duration',
      serviceName: 'opbeans-java',
      transactionType: 'request',
    });

    expect(href).toMatchInlineSnapshot(
      `"/app/ml#/timeseriesexplorer?_g=(ml:(jobIds:!(apm-production-485b-high_mean_transaction_duration)),refreshInterval:(pause:!t,value:10000),time:(from:'2020-07-29T17:27:29.000Z',to:'2020-07-29T18:45:00.000Z'))&_a=(mlTimeSeriesExplorer:(entities:(service.name:opbeans-java,transaction.type:request),zoom:(from:'2020-07-29T17:27:29.000Z',to:'2020-07-29T18:45:00.000Z')))"`
    );
  });
});

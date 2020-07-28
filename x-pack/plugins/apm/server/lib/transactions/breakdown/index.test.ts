/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTransactionBreakdown } from '.';
import * as constants from './constants';
import noDataResponse from './mock_responses/no_data.json';
import dataResponse from './mock_responses/data.json';
import { APMConfig } from '../../..';

const mockIndices = {
  'apm_oss.sourcemapIndices': 'myIndex',
  'apm_oss.errorIndices': 'myIndex',
  'apm_oss.onboardingIndices': 'myIndex',
  'apm_oss.spanIndices': 'myIndex',
  'apm_oss.transactionIndices': 'myIndex',
  'apm_oss.metricsIndices': 'myIndex',
  apmAgentConfigurationIndex: 'myIndex',
  apmCustomLinkIndex: 'myIndex',
};

function getMockSetup(esResponse: any) {
  const clientSpy = jest.fn().mockReturnValueOnce(esResponse);
  return {
    start: 0,
    end: 500000,
    client: { search: clientSpy } as any,
    internalClient: { search: clientSpy } as any,
    config: new Proxy(
      {},
      {
        get: () => 'myIndex',
      }
    ) as APMConfig,
    uiFiltersES: [],
    indices: mockIndices,
    dynamicIndexPattern: null as any,
  };
}

describe('getTransactionBreakdown', () => {
  it('returns an empty array if no data is available', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(noDataResponse),
    });

    expect(response.kpis.length).toBe(0);

    expect(Object.keys(response.timeseries).length).toBe(0);
  });

  it('returns transaction breakdowns grouped by type and subtype', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
    });

    expect(response.kpis.length).toBe(4);

    expect(response.kpis.map((kpi) => kpi.name)).toEqual([
      'app',
      'dispatcher-servlet',
      'http',
      'postgresql',
    ]);

    expect(response.kpis[0]).toEqual({
      name: 'app',
      color: '#54b399',
      percentage: 0.5408550899466306,
    });

    expect(response.kpis[3]).toEqual({
      name: 'postgresql',
      color: '#9170b8',
      percentage: 0.047366859295002,
    });
  });

  it('returns a timeseries grouped by type and subtype', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
    });

    const { timeseries } = response;

    expect(timeseries.length).toBe(4);

    const appTimeseries = timeseries[0];
    expect(appTimeseries.title).toBe('app');
    expect(appTimeseries.type).toBe('areaStacked');
    expect(appTimeseries.hideLegend).toBe(true);

    // empty buckets should result in null values for visible types
    expect(appTimeseries.data.length).toBe(276);
    expect(appTimeseries.data.length).not.toBe(257);

    expect(appTimeseries.data[0].x).toBe(1561102380000);

    expect(appTimeseries.data[0].y).toBeCloseTo(0.8689440187037277);
  });

  it('should not include more KPIs than MAX_KPIs', async () => {
    // @ts-ignore
    constants.MAX_KPIS = 2;

    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
    });

    const { timeseries } = response;

    expect(timeseries.map((serie) => serie.title)).toEqual(['app', 'http']);
  });

  it('fills in gaps for a given timestamp', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
    });

    const { timeseries } = response;

    const appTimeseries = timeseries.find((series) => series.title === 'app');

    // missing values should be 0 if other span types do have data for that timestamp
    expect((appTimeseries as NonNullable<typeof appTimeseries>).data[1].y).toBe(
      0
    );
  });
});

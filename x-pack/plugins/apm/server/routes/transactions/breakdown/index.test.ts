/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransactionBreakdown } from '.';
import * as constants from './constants';
import noDataResponse from './mock_responses/no_data.json';
import dataResponse from './mock_responses/data.json';
import { APMConfig } from '../../..';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { ApmIndicesConfig } from '../../../routes/settings/apm_indices/get_apm_indices';

const mockIndices: ApmIndicesConfig = {
  sourcemap: 'myIndex',
  error: 'myIndex',
  onboarding: 'myIndex',
  span: 'myIndex',
  transaction: 'myIndex',
  metric: 'myIndex',
  apmAgentConfigurationIndex: 'myIndex',
  apmCustomLinkIndex: 'myIndex',
};

function getMockSetup(esResponse: any) {
  const clientSpy = jest.fn().mockReturnValueOnce(esResponse);
  return {
    apmEventClient: { search: clientSpy } as any,
    internalClient: { search: clientSpy } as any,
    config: new Proxy(
      {},
      {
        get: () => 'myIndex',
      }
    ) as APMConfig,
    uiFilters: {},
    indices: mockIndices,
  };
}

describe('getTransactionBreakdown', () => {
  it('returns an empty array if no data is available', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(noDataResponse),
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      start: 0,
      end: 500000,
    });

    expect(Object.keys(response.timeseries).length).toBe(0);
  });

  it('returns a timeseries grouped by type and subtype', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      start: 0,
      end: 500000,
    });

    const { timeseries } = response;

    expect(timeseries.length).toBe(4);

    const appTimeseries = timeseries[0];
    expect(appTimeseries.title).toBe('app');
    expect(appTimeseries.type).toBe('areaStacked');
    expect(appTimeseries.hideLegend).toBe(false);

    // empty buckets should result in null values for visible types
    expect(appTimeseries.data.length).toBe(276);
    expect(appTimeseries.data.length).not.toBe(257);

    expect(appTimeseries.data[0].x).toBe(1561102380000);

    expect(appTimeseries.data[0].y).toBeCloseTo(0.8689440187037277);
  });

  it('should not include more KPIs than MAX_KPIs', async () => {
    // @ts-expect-error
    constants.MAX_KPIS = 2;

    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      start: 0,
      end: 500000,
    });

    const { timeseries } = response;

    expect(timeseries.map((serie) => serie.title)).toEqual(['app', 'http']);
  });

  it('fills in gaps for a given timestamp', async () => {
    const response = await getTransactionBreakdown({
      serviceName: 'myServiceName',
      transactionType: 'request',
      setup: getMockSetup(dataResponse),
      environment: ENVIRONMENT_ALL.value,
      kuery: '',
      start: 0,
      end: 500000,
    });

    const { timeseries } = response;

    const appTimeseries = timeseries.find((series) => series.title === 'app');

    // missing values should be 0 if other span types do have data for that timestamp
    expect((appTimeseries as NonNullable<typeof appTimeseries>).data[1].y).toBe(
      0
    );
  });
});

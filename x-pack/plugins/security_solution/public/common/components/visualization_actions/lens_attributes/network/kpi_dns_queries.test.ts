/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { kpiDnsQueriesLensAttributes } from './kpi_dns_queries';

jest.mock('../../../../containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
  }),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: '192.168.1.1',
      pageName: 'network',
      tabName: 'events',
    },
  ]),
}));

describe('kpiDnsQueriesLensAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: kpiDnsQueriesLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

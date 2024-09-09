/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { kpiUserAuthenticationsMetricFailureLensAttributes } from './kpi_user_authentication_metric_failure';

jest.mock('../../../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
  }),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'elastic',
      pageName: 'users',
      tabName: 'events',
    },
  ]),
}));

describe('kpiUserAuthenticationsMetricFailureLensAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: kpiUserAuthenticationsMetricFailureLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

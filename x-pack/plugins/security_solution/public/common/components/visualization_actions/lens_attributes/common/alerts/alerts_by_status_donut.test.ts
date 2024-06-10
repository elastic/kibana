/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { mockExtraFilter, wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getAlertsByStatusAttributes } from './alerts_by_status_donut';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('b9b43606-7ff7-46ae-a47c-85bed80fab9a'),
}));

jest.mock('../../../../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
    selectedPatterns: ['signal-index'],
  }),
}));

jest.mock('../../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      pageName: 'alerts',
    },
  ]),
}));

describe('getAlertsByStatusAttributes', () => {
  it('should render without extra options', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getAlertsByStatusAttributes,
          stackByField: 'kibana.alert.workflow_status',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render with extra options - filters', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: {
            filters: mockExtraFilter,
          },
          getLensAttributes: getAlertsByStatusAttributes,
          stackByField: 'kibana.alert.workflow_status',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual(expect.arrayContaining(mockExtraFilter));
  });
});

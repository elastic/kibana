/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { wrapper } from '../../../mocks';

import { useLensAttributes } from '../../../use_lens_attributes';

import { getAlertsTableLensAttributes } from './alerts_table';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('4aa7cf71-cf20-4e62-8ca6-ca6be6b0988b'),
}));

jest.mock('../../../../../containers/sourcerer', () => ({
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

describe('getAlertsTableLensAttributes', () => {
  it('should render without extra options', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
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
            filters: [
              {
                meta: {
                  type: 'phrases',
                  key: '_index',
                  params: ['.alerts-security.alerts-default'],
                  alias: null,
                  negate: false,
                  disabled: false,
                },
                query: {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          _index: '.alerts-security.alerts-default',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            ],
          },
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('should render with extra options - breakdownField', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          extraOptions: { breakdownField: 'agent.type' },
          getLensAttributes: getAlertsTableLensAttributes,
          stackByField: 'event.category',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

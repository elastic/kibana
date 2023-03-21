/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getEventsHistogramLensAttributes } from './events';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('0039eb0c-9a1a-4687-ae54-0f4e239bec75'),
}));

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
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'events',
    },
  ]),
}));

describe('getEventsHistogramLensAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });
});

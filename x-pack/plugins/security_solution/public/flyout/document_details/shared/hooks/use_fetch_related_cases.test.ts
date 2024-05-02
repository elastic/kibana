/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createReactQueryWrapper } from '../../../../common/mock';
import { useFetchRelatedCases } from './use_fetch_related_cases';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      cases: {
        api: {
          getRelatedCases: jest.fn().mockResolvedValue([]),
        },
      },
    },
  }),
}));

const eventId = 'eventId';

describe('useFetchRelatedCases', () => {
  it(`should return loading true while data is loading`, () => {
    const hookResult = renderHook(() => useFetchRelatedCases({ eventId }), {
      wrapper: createReactQueryWrapper(),
    });

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual([]);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });
});

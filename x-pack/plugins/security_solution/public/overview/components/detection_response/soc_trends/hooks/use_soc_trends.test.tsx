/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSocTrends } from './use_soc_trends';
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../../common/mock';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useCasesMttr } from './use_cases_mttr';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const dateNow = new Date('2022-04-15T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

jest.mock('./use_cases_mttr');
jest.mock('../../../../../common/containers/use_global_time');
describe('useSocTrends', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  beforeEach(() => {
    (useCasesMttr as jest.Mock).mockReturnValue({
      updatedAt: Date.now(),
      isLoading: true,
      casesMttr: '-',
      percentage: {
        percent: null,
        color: 'hollow',
        note: 'There is no case data to compare',
      },
    });
    (useGlobalTime as jest.Mock).mockReturnValue({
      from: '2020-07-07T08:20:18.966Z',
      deleteQuery: () => {},
      to: '2020-07-08T08:20:18.966Z',
      setQuery: () => {},
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('loads initial state', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSocTrends({ skip: false }), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: {
          casesMttr: '-',
          isLoading: true,
          percentage: {
            percent: null,
            color: 'hollow',
            note: 'There is no case data to compare',
          },
          updatedAt: dateNow,
        },
      });
    });
  });
});

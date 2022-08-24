/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseCasesMttr } from './use_cases_mttr';
import { useCasesMttr } from './use_cases_mttr';
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../../common/mock';
import { useKibana as useKibanaMock } from '../../../../../common/lib/kibana/__mocks__';
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

jest.mock('../../../../../common/lib/kibana');
const props: UseCasesMttr = {
  deleteQuery: jest.fn(),
  from: '2020-07-07T08:20:18.966Z',
  fromCompare: '2020-07-06T08:20:18.966Z',
  setQuery: jest.fn(),
  skip: false,
  to: '2020-07-08T08:20:18.966Z',
  toCompare: '2020-07-07T08:20:18.966Z',
};

describe('useCasesMttr', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  const mockGetCasesMetrics = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('loads initial state', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCasesMttr(props), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '-',
        isLoading: true,
        percentage: {
          percent: null,
          color: 'hollow',
          note: 'There is no case data to compare',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('finds positive percentage change', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({ mttr: 5000 });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCasesMttr(props), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '2h',
        isLoading: false,
        percentage: {
          percent: '100.0%',
          color: 'danger',
          note: 'Your case resolution time is up by 100.0% from 1h',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('finds negative percentage change', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 5000 })
      .mockReturnValue({ mttr: 10000 });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCasesMttr(props), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '1h',
        isLoading: false,
        percentage: {
          percent: '-50.0%',
          color: 'success',
          note: 'Your case resolution time is down by 50.0% from 2h',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('finds zero percentage change', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics.mockReturnValue({
      mttr: 10000,
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCasesMttr(props), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '2h',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: 'Your case resolution time is unchanged',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('handles null mttr - current time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: null })
      .mockReturnValue({ mttr: 10000 });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCasesMttr(props), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: 'There is no case data to compare from the current time range',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('handles null mttr - compare time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({ mttr: null });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useCasesMttr(props), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '2h',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: 'There is no case data to compare from the compare time range',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('handles null mttr - current & compare time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({
        mttr: null,
      });
    await act(async () => {
      let ourProps = props;
      const { result, rerender, waitForNextUpdate } = renderHook(() => useCasesMttr(ourProps), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '2h',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: 'Your case resolution time is unchanged',
        },
        updatedAt: dateNow,
      });
      ourProps = {
        ...props,
        from: '2020-07-08T08:20:18.966Z',
        to: '2020-07-09T08:20:18.966Z',
      };
      rerender();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: 'There is no case data to compare',
        },
        updatedAt: dateNow,
      });
    });
  });
  it('handles undefined mttr - current & compare time range', async () => {
    useKibanaMock().services.cases.api.cases.getCasesMetrics = mockGetCasesMetrics
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValueOnce({ mttr: 10000 })
      .mockReturnValue({
        mttr: undefined,
      });
    await act(async () => {
      let ourProps = props;
      const { result, rerender, waitForNextUpdate } = renderHook(() => useCasesMttr(ourProps), {
        wrapper: wrapperContainer,
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '2h',
        isLoading: false,
        percentage: {
          percent: '0.0%',
          color: 'hollow',
          note: 'Your case resolution time is unchanged',
        },
        updatedAt: dateNow,
      });
      ourProps = {
        ...props,
        from: '2020-07-08T08:20:18.966Z',
        to: '2020-07-09T08:20:18.966Z',
      };
      rerender();
      rerender();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        casesMttr: '-',
        isLoading: false,
        percentage: {
          percent: null,
          color: 'hollow',
          note: 'There is no case data to compare',
        },
        updatedAt: dateNow,
      });
    });
  });
});

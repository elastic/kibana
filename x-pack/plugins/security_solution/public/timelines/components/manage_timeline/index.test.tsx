/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { getTimelineDefaults, useTimelineManager, UseTimelineManager } from './';
import { FilterManager } from '../../../../../../../src/plugins/data/public/query/filter_manager';
import { coreMock } from '../../../../../../../src/core/public/mocks';

const isStringifiedComparisonEqual = (a: {}, b: {}): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

describe('useTimelineManager', () => {
  const setupMock = coreMock.createSetup();
  const testId = 'coolness';
  const timelineDefaults = getTimelineDefaults(testId);
  const mockFilterManager = new FilterManager(setupMock.uiSettings);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('initializes an undefined timeline', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
        useTimelineManager()
      );
      await waitForNextUpdate();
      const uninitializedTimeline = result.current.getManageTimelineById(testId);
      expect(isStringifiedComparisonEqual(uninitializedTimeline, timelineDefaults)).toBeTruthy();
    });
  });
  // TO DO sourcerer
  // it('getIndexToAddById', async () => {
  //   await act(async () => {
  //     const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
  //       useTimelineManager()
  //     );
  //     await waitForNextUpdate();
  //     const data = result.current.getIndexToAddById(testId);
  //     expect(data).toEqual(timelineDefaults.indexToAdd);
  //   });
  // });
  //
  // it('setIndexToAdd', async () => {
  //   await act(async () => {
  //     const indexToAddArgs = { id: testId, indexToAdd: ['example'] };
  //     const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
  //       useTimelineManager()
  //     );
  //     await waitForNextUpdate();
  //     result.current.initializeTimeline({
  //       id: testId,
  //     });
  //     result.current.setIndexToAdd(indexToAddArgs);
  //     const data = result.current.getIndexToAddById(testId);
  //     expect(data).toEqual(indexToAddArgs.indexToAdd);
  //   });
  // });

  it('setIsTimelineLoading', async () => {
    await act(async () => {
      const isLoadingArgs = { id: testId, isLoading: true };
      const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
        useTimelineManager()
      );
      await waitForNextUpdate();
      result.current.initializeTimeline({
        id: testId,
      });
      let timeline = result.current.getManageTimelineById(testId);
      expect(timeline.isLoading).toBeFalsy();
      result.current.setIsTimelineLoading(isLoadingArgs);
      timeline = result.current.getManageTimelineById(testId);
      expect(timeline.isLoading).toBeTruthy();
    });
  });

  it('getTimelineFilterManager undefined on uninitialized', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
        useTimelineManager()
      );
      await waitForNextUpdate();
      const data = result.current.getTimelineFilterManager(testId);
      expect(data).toEqual(undefined);
    });
  });

  it('getTimelineFilterManager defined at initialize', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
        useTimelineManager()
      );
      await waitForNextUpdate();
      result.current.initializeTimeline({
        id: testId,
        filterManager: mockFilterManager,
      });
      const data = result.current.getTimelineFilterManager(testId);
      expect(data).toEqual(mockFilterManager);
    });
  });

  it('isManagedTimeline returns false when unset and then true when set', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseTimelineManager>(() =>
        useTimelineManager()
      );
      await waitForNextUpdate();
      let data = result.current.isManagedTimeline(testId);
      expect(data).toBeFalsy();
      result.current.initializeTimeline({
        id: testId,
        filterManager: mockFilterManager,
      });
      data = result.current.isManagedTimeline(testId);
      expect(data).toBeTruthy();
    });
  });
});

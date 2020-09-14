/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { getSourceDefaults, useSourceManager, UseSourceManager } from '.';
import {
  mockSourceSelections,
  mockSourceGroup,
  mockSourceGroups,
  mockPatterns,
  mockSource,
} from './mocks';
import { SecurityPageName } from './constants';
const mockSourceDefaults = mockSource(SecurityPageName.default);
jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      data: {
        indexPatterns: {
          getTitles: jest.fn().mockImplementation(() => Promise.resolve(mockPatterns)),
        },
      },
    },
  }),
}));
jest.mock('../../utils/apollo_context', () => ({
  useApolloClient: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation(() => Promise.resolve(mockSourceDefaults)),
  }),
}));

describe('Sourcerer Hooks', () => {
  const testId = SecurityPageName.default;
  const uninitializedId = SecurityPageName.host;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe('Initialization', () => {
    it('initializes loading default index patterns', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourceGroupId: 'default',
          availableIndexPatterns: [],
          availableSourceGroupIds: [],
          isIndexPatternsLoading: true,
          sourceGroups: {},
          getManageSourceGroupById: result.current.getManageSourceGroupById,
          initializeSourceGroup: result.current.initializeSourceGroup,
          setActiveSourceGroupId: result.current.setActiveSourceGroupId,
          updateSourceGroupIndicies: result.current.updateSourceGroupIndicies,
        });
      });
    });
    it('initializes loading default source group', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourceGroupId: 'default',
          availableIndexPatterns: mockPatterns,
          availableSourceGroupIds: [],
          isIndexPatternsLoading: false,
          sourceGroups: {},
          getManageSourceGroupById: result.current.getManageSourceGroupById,
          initializeSourceGroup: result.current.initializeSourceGroup,
          setActiveSourceGroupId: result.current.setActiveSourceGroupId,
          updateSourceGroupIndicies: result.current.updateSourceGroupIndicies,
        });
      });
    });
    it('initialize completes with formatted source group data', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourceGroupId: testId,
          availableIndexPatterns: mockPatterns,
          availableSourceGroupIds: [testId],
          isIndexPatternsLoading: false,
          sourceGroups: {
            default: mockSourceGroup(testId),
          },
          getManageSourceGroupById: result.current.getManageSourceGroupById,
          initializeSourceGroup: result.current.initializeSourceGroup,
          setActiveSourceGroupId: result.current.setActiveSourceGroupId,
          updateSourceGroupIndicies: result.current.updateSourceGroupIndicies,
        });
      });
    });
  });
  describe('Methods', () => {
    it('getManageSourceGroupById: initialized source group returns defaults', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        const initializedSourceGroup = result.current.getManageSourceGroupById(testId);
        expect(initializedSourceGroup).toEqual(mockSourceGroup(testId));
      });
    });
    it('getManageSourceGroupById: uninitialized source group returns defaults', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        const uninitializedSourceGroup = result.current.getManageSourceGroupById(uninitializedId);
        expect(uninitializedSourceGroup).toEqual(getSourceDefaults(uninitializedId, mockPatterns));
      });
    });
    it('initializeSourceGroup: initializes source group', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        result.current.initializeSourceGroup(
          uninitializedId,
          mockSourceGroups[uninitializedId],
          true
        );
        await waitForNextUpdate();
        const initializedSourceGroup = result.current.getManageSourceGroupById(uninitializedId);
        expect(initializedSourceGroup.indexPatterns).toEqual(mockSourceSelections[uninitializedId]);
      });
    });
    it('setActiveSourceGroupId: active source group id gets set only if it gets initialized first', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        expect(result.current.activeSourceGroupId).toEqual(testId);
        result.current.setActiveSourceGroupId(uninitializedId);
        expect(result.current.activeSourceGroupId).toEqual(testId);
        result.current.initializeSourceGroup(uninitializedId);
        result.current.setActiveSourceGroupId(uninitializedId);
        expect(result.current.activeSourceGroupId).toEqual(uninitializedId);
      });
    });
    it('updateSourceGroupIndicies: updates source group indicies', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
          useSourceManager()
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        let sourceGroup = result.current.getManageSourceGroupById(testId);
        expect(sourceGroup.indexPatterns).toEqual(mockSourceSelections[testId]);
        result.current.updateSourceGroupIndicies(testId, ['endgame-*', 'filebeat-*']);
        await waitForNextUpdate();
        sourceGroup = result.current.getManageSourceGroupById(testId);
        expect(sourceGroup.indexPatterns).toEqual(['endgame-*', 'filebeat-*']);
      });
    });
  });
});

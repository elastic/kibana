/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { noop } from 'lodash/fp';
import { useTimelineLastEventTime, UseTimelineLastEventTimeArgs } from '.';
import { LastEventIndexKey } from '../../../../../common/search_strategy';
import { useKibana } from '../../../lib/kibana';

const mockSearchStrategy = jest.fn();
const mockUseKibana = {
  services: {
    data: {
      search: {
        search: mockSearchStrategy.mockReturnValue({
          unsubscribe: jest.fn(),
          subscribe: jest.fn(({ next, error }) => {
            const mockData = {
              lastSeen: '1 minute ago',
            };
            try {
              next(mockData);
              /* eslint-disable no-empty */
            } catch (e) {}
            return {
              unsubscribe: jest.fn(),
            };
          }),
        }),
      },
    },
    notifications: {
      toasts: {
        addWarning: jest.fn(),
      },
    },
  },
};

jest.mock('../../../lib/kibana', () => ({
  useKibana: jest.fn(),
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
  }),
}));

describe('useTimelineLastEventTime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(mockUseKibana);
  });

  it('should init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        string,
        [boolean, UseTimelineLastEventTimeArgs]
      >(() =>
        useTimelineLastEventTime({
          indexKey: LastEventIndexKey.hostDetails,
          details: {},
          docValueFields: [],
          indexNames: [],
        })
      );
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        { errorMessage: undefined, lastSeen: null, refetch: noop },
      ]);
    });
  });

  it('should call search strategy', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, [boolean, UseTimelineLastEventTimeArgs]>(
        () =>
          useTimelineLastEventTime({
            indexKey: LastEventIndexKey.hostDetails,
            details: {},
            docValueFields: [],
            indexNames: [],
          })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(mockSearchStrategy.mock.calls[0][0]).toEqual({
        defaultIndex: [],
        details: {},
        docValueFields: [],
        factoryQueryType: 'eventsLastEventTime',
        indexKey: 'hostDetails',
      });
    });
  });

  it('should set response', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        string,
        [boolean, UseTimelineLastEventTimeArgs]
      >(() =>
        useTimelineLastEventTime({
          indexKey: LastEventIndexKey.hostDetails,
          details: {},
          docValueFields: [],
          indexNames: [],
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current[1].lastSeen).toEqual('1 minute ago');
    });
  });
});

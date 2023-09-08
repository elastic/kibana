/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useRuleFromTimeline } from './use_rule_from_timeline';
import { useGetInitialUrlParamValue } from '../../../../common/utils/global_query_string/helpers';
import { resolveTimeline } from '../../../../timelines/containers/api';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { mockTimeline } from '../../../../../server/lib/timeline/__mocks__/create_timelines';
import type { TimelineModel } from '../../../..';

jest.mock('../../../../common/utils/global_query_string/helpers');
jest.mock('../../../../timelines/containers/api');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/containers/sourcerer');
jest.mock('../../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn().mockImplementation((path: string) => path),
    }),
  };
});

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const timelineId = 'eb2781c0-1df5-11eb-8589-2f13958b79f7';

const selectedTimeline = {
  data: {
    timeline: {
      ...mockTimeline,
      id: timelineId,
      savedObjectId: timelineId,
      indexNames: ['awesome-*'],
      dataViewId: 'custom-data-view-id',
      kqlQuery: {
        filterQuery: {
          serializedQuery:
            '{"bool":{"filter":[{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field":"user.name"}}],"minimum_should_match":1}}]}}',
          kuery: {
            expression: 'host.name:* AND user.name:*',
            kind: 'kuery',
          },
        },
      },
      dataProviders: [
        {
          excluded: false,
          and: [],
          kqlQuery: '',
          name: 'Stephs-MBP.lan',
          queryMatch: {
            field: 'host.name',
            value: 'Stephs-MBP.lan',
            operator: ':',
          },
          id: 'draggable-badge-default-draggable-process_stopped-timeline-1-NH9UwoMB2HTqQ3G4wUFM-host_name-Stephs-MBP_lan',
          enabled: true,
        },
        {
          excluded: false,
          and: [],
          kqlQuery: '',
          name: '--lang=en-US',
          queryMatch: {
            field: 'process.args',
            value: '--lang=en-US',
            operator: ':',
          },
          id: 'draggable-badge-default-draggable-process_started-timeline-1-args-5---lang=en-US-MH9TwoMB2HTqQ3G4_UH--process_args---lang=en-US',
          enabled: true,
        },
      ],
    },
  },
};

describe('useRuleFromTimeline', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  const setRuleQuery = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(() => timelineId);
    (resolveTimeline as jest.Mock).mockResolvedValue(selectedTimeline);
  });

  describe('initial data view === rule from timeline data view', () => {
    beforeEach(() => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        ...mockSourcererScope,
        dataViewId: 'custom-data-view-id',
        selectedPatterns: ['awesome-*'],
      });
    });

    it('does not reset timeline sourcerer if it originally had same data view as the timeline used in the rule', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      expect(result.current.loading).toEqual(true);
      await waitForNextUpdate();
      expect(setRuleQuery).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('initial data view !== rule from timeline data view', () => {
    beforeEach(() => {
      (useSourcererDataView as jest.Mock)
        .mockReturnValueOnce({
          ...mockSourcererScope,
          dataViewId: 'security-solution',
          selectedPatterns: ['auditbeat-*'],
        })
        .mockReturnValue({
          ...mockSourcererScope,
          dataViewId: 'custom-data-view-id',
          selectedPatterns: ['awesome-*'],
        });
    });
    it('if no timeline id in URL, loading: false and query not set', async () => {
      (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(() => undefined);
      const { result } = renderHook(() => useRuleFromTimeline(setRuleQuery));

      expect(result.current.loading).toEqual(false);
      expect(setRuleQuery).not.toHaveBeenCalled();
    });

    it('if timeline id in URL, set active timeline data view to from timeline data view', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      expect(result.current.loading).toEqual(true);
      await waitForNextUpdate();
      expect(setRuleQuery).toHaveBeenCalled();

      expect(mockDispatch).toHaveBeenCalledTimes(4);
      expect(mockDispatch).toHaveBeenNthCalledWith(1, {
        type: 'x-pack/security_solution/local/timeline/UPDATE_LOADING',
        payload: {
          id: 'timeline-1',
          isLoading: true,
        },
      });

      expect(mockDispatch).toHaveBeenNthCalledWith(2, {
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
        payload: {
          id: 'timeline',
          selectedDataViewId: selectedTimeline.data.timeline.dataViewId,
          selectedPatterns: selectedTimeline.data.timeline.indexNames,
        },
      });
      expect(mockDispatch).toHaveBeenNthCalledWith(3, {
        type: 'x-pack/security_solution/local/timeline/UPDATE_LOADING',
        payload: {
          id: 'timeline-1',
          isLoading: false,
        },
      });
    });

    it('when from timeline data view id === selected data view id and browser fields is not empty, set rule data to match from timeline query', async () => {
      (useGetInitialUrlParamValue as jest.Mock)
        .mockReturnValueOnce(() => timelineId)
        .mockReturnValue(() => undefined);
      const { result, waitForNextUpdate } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      expect(result.current.loading).toEqual(true);
      await waitForNextUpdate();
      expect(result.current.loading).toEqual(false);
      expect(setRuleQuery).toHaveBeenCalledWith({
        index: ['awesome-*'],
        queryBar: {
          filters: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'host.name': 'Stephs-MBP.lan' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ match_phrase: { 'process.args': '--lang=en-US' } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
              meta: {
                alias: 'timeline-filter-drop-area',
                controlledBy: 'timeline-filter-drop-area',
                negate: false,
                disabled: false,
                type: 'custom',
                key: 'bool',
                value:
                  '{"bool":{"should":[{"bool":{"should":[{"match_phrase":{"host.name":"Stephs-MBP.lan"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"process.args":"--lang=en-US"}}],"minimum_should_match":1}}],"minimum_should_match":1}}',
              },
              $state: { store: 'appState' },
            },
          ],
          query: { query: 'host.name:* AND user.name:*', language: 'kuery' },
          saved_id: null,
        },
      });
    });

    it('when timeline has eql, set rule data to match from eql query', async () => {
      const eqlOptions = {
        eventCategoryField: 'category',
        tiebreakerField: '',
        timestampField: '@timestamp',
        query: 'find it EQL',
        size: 100,
      };
      const eqlTimeline = {
        data: {
          timeline: {
            ...mockTimeline,
            id: timelineId,
            savedObjectId: timelineId,
            indexNames: ['awesome-*'],
            dataViewId: 'custom-data-view-id',
            eqlOptions,
          },
        },
      };
      (resolveTimeline as jest.Mock).mockResolvedValue(eqlTimeline);
      (useGetInitialUrlParamValue as jest.Mock)
        .mockReturnValueOnce(() => undefined)
        .mockReturnValue(() => timelineId);
      const { result, waitForNextUpdate } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      expect(result.current.loading).toEqual(true);
      await waitForNextUpdate();
      expect(result.current.loading).toEqual(false);
      expect(setRuleQuery).toHaveBeenCalledWith({
        index: ['awesome-*'],
        queryBar: {
          filters: [],
          query: { query: 'find it EQL', language: 'eql' },
          saved_id: null,
        },
        eqlOptions,
      });
    });

    it('Sets rule from timeline query via callback', async () => {
      (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(() => undefined);
      const { result } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      expect(result.current.loading).toEqual(false);
      await act(async () => {
        result.current.onOpenTimeline(selectedTimeline.data.timeline as unknown as TimelineModel);
      });

      // not loading anything as an external call to onOpenTimeline provides the timeline
      expect(result.current.loading).toEqual(false);
      expect(setRuleQuery).toHaveBeenCalledWith({
        index: ['awesome-*'],
        queryBar: {
          filters: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'host.name': 'Stephs-MBP.lan' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ match_phrase: { 'process.args': '--lang=en-US' } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
              meta: {
                alias: 'timeline-filter-drop-area',
                controlledBy: 'timeline-filter-drop-area',
                negate: false,
                disabled: false,
                type: 'custom',
                key: 'bool',
                value:
                  '{"bool":{"should":[{"bool":{"should":[{"match_phrase":{"host.name":"Stephs-MBP.lan"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"process.args":"--lang=en-US"}}],"minimum_should_match":1}}],"minimum_should_match":1}}',
              },
              $state: { store: 'appState' },
            },
          ],
          query: { query: 'host.name:* AND user.name:*', language: 'kuery' },
          saved_id: null,
        },
      });
    });

    it('Handles error when query is malformed', async () => {
      (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(() => undefined);
      const { result } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      expect(result.current.loading).toEqual(false);
      const tl = {
        ...selectedTimeline.data.timeline,
        dataProviders: [
          {
            property: 'bad',
          },
        ],
      };
      await act(async () => {
        result.current.onOpenTimeline(tl as unknown as TimelineModel);
      });

      // not loading anything as an external call to onOpenTimeline provides the timeline
      expect(result.current.loading).toEqual(false);
      expect(setRuleQuery).not.toHaveBeenCalled();
      expect(appToastsMock.addError).toHaveBeenCalled();
      expect(appToastsMock.addError.mock.calls[0][0]).toEqual(
        TypeError('dataProvider.and is not iterable')
      );
    });

    it('resets timeline sourcerer if it originally had different data view from the timeline used in the rule', async () => {
      const { waitForNextUpdate } = renderHook(() => useRuleFromTimeline(setRuleQuery));
      await waitForNextUpdate();
      expect(setRuleQuery).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenNthCalledWith(4, {
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
        payload: {
          id: 'timeline',
          selectedDataViewId: 'security-solution',
          selectedPatterns: ['auditbeat-*'],
        },
      });
    });
  });
});

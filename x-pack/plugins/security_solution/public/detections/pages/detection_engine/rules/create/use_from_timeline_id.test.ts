/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useFromTimelineId } from './use_from_timeline_id';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { resolveTimeline } from '../../../../../timelines/containers/api';
import { mockTimeline } from '../../../../../../server/lib/timeline/__mocks__/create_timelines';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../../../common/utils/global_query_string/helpers');
jest.mock('../../../../../common/hooks/use_selector');
jest.mock('../../../../../timelines/containers/api');

const defaults = {
  index: ['auditbeat-*'],
  queryBar: { query: { query: '', language: '' }, filters: [], saved_id: null },
};
const fromTimeline = {
  data: {
    timeline: {
      ...mockTimeline,
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
describe('useFromTimelineId', () => {
  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      selectedDataView: {
        id: 'not-the one',
        browserFields: mockBrowserFields,
        patternList: [],
      },
      sourcererScope: {
        selectedDataViewId: 'cool-data-view-id',
        selectedPatterns: ['auditbeat-*'],
      },
    });
    (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(() => ({
      decodedParam: 'eb2781c0-1df5-11eb-8589-2f13958b79f7',
    }));
    (resolveTimeline as jest.Mock).mockResolvedValue(fromTimeline);
    jest.clearAllMocks();
  });

  it('if no from timeline id, update false and loading false', async () => {
    (useGetInitialUrlParamValue as jest.Mock).mockReturnValue(() => ({
      decodedParam: undefined,
    }));
    const { result } = renderHook(() => useFromTimelineId(defaults));
    expect(result.current).toEqual({
      ...defaults,
      updated: false,
      loading: false,
    });
  });

  it('if from timeline id, update false and loading true', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useFromTimelineId(defaults));
    expect(result.current).toEqual({
      ...defaults,
      updated: false,
      loading: true,
    });
    await waitForNextUpdate();
  });

  it('if from timeline id, set active timeline data view to from timeline data view', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useFromTimelineId(defaults));
    await waitForNextUpdate();
    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch).toHaveBeenNthCalledWith(1, {
      type: 'x-pack/timelines/t-grid/UPDATE_LOADING',
      payload: {
        id: 'timeline-1',
        isLoading: true,
      },
    });

    expect(mockDispatch).toHaveBeenNthCalledWith(2, {
      type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
      payload: {
        id: 'timeline',
        selectedDataViewId: fromTimeline.data.timeline.dataViewId,
        selectedPatterns: fromTimeline.data.timeline.indexNames,
      },
    });
    expect(mockDispatch).toHaveBeenNthCalledWith(3, {
      type: 'x-pack/timelines/t-grid/UPDATE_LOADING',
      payload: {
        id: 'timeline-1',
        isLoading: false,
      },
    });

    expect(result.current).toEqual({
      ...defaults,
      updated: false,
      loading: true,
    });
  });

  it('when from timeline data view id ===  selected data view id and broswer fields is not empty, set rule data to match from timeline query', async () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      selectedDataView: {
        id: 'security-solution',
        browserFields: mockBrowserFields,
        patternList: [],
      },
      sourcererScope: {
        selectedDataViewId: 'security-solution',
        selectedPatterns: ['auditbeat-*'],
      },
    });
    const { result, waitForNextUpdate } = renderHook(() => useFromTimelineId(defaults));
    await waitForNextUpdate();

    expect(result.current).toEqual({
      index: [
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'winlogbeat-*',
        '.siem-signals-angelachuang-default',
      ],
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
      updated: true,
      loading: false,
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import sinon from 'sinon';
import moment from 'moment';

import { sendAlertToTimelineAction, determineToAndFrom } from './actions';
import {
  mockEcsDataWithAlert,
  defaultTimelineProps,
  apolloClient,
  mockTimelineApolloResult,
  mockTimelineDetailsApollo,
  mockTimelineDetails,
} from '../../../common/mock/';
import { CreateTimeline, UpdateTimelineLoading } from './types';
import { Ecs } from '../../../../common/ecs';
import {
  TimelineId,
  TimelineType,
  TimelineStatus,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { ISearchStart } from '../../../../../../../src/plugins/data/public';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';

jest.mock('apollo-client');

describe('alert actions', () => {
  const anchor = '2020-03-01T17:59:46.349Z';
  const unix = moment(anchor).valueOf();
  let createTimeline: CreateTimeline;
  let updateTimelineIsLoading: UpdateTimelineLoading;
  let searchStrategyClient: jest.Mocked<ISearchStart>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    // jest carries state between mocked implementations when using
    // spyOn. So now we're doing all three of these.
    // https://github.com/facebook/jest/issues/7136#issuecomment-565976599
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();

    createTimeline = jest.fn() as jest.Mocked<CreateTimeline>;
    updateTimelineIsLoading = jest.fn() as jest.Mocked<UpdateTimelineLoading>;

    searchStrategyClient = {
      ...dataPluginMock.createStartContract().search,
      aggs: {} as ISearchStart['aggs'],
      showError: jest.fn(),
      search: jest
        .fn()
        .mockImplementation(() => ({ toPromise: () => ({ data: mockTimelineDetails }) })),
      searchSource: {} as ISearchStart['searchSource'],
    };

    jest.spyOn(apolloClient, 'query').mockImplementation((obj) => {
      const id = get('variables.id', obj);
      if (id != null) {
        return Promise.resolve(mockTimelineApolloResult);
      }
      return Promise.resolve(mockTimelineDetailsApollo);
    });

    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('sendAlertToTimelineAction', () => {
    describe('timeline id is NOT empty string and apollo client exists', () => {
      test('it invokes updateTimelineIsLoading to set to true', async () => {
        await sendAlertToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });

        expect(updateTimelineIsLoading).toHaveBeenCalledTimes(1);
        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: TimelineId.active,
          isLoading: true,
        });
      });

      test('it invokes createTimeline with designated timeline template if "timelineTemplate" exists', async () => {
        await sendAlertToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });
        const expected = {
          from: '2018-11-05T18:58:25.937Z',
          notes: null,
          timeline: {
            activeTab: TimelineTabs.query,
            columns: [
              {
                columnHeaderType: 'not-filtered',
                id: '@timestamp',
                type: 'number',
                width: 190,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'message',
                width: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'event.category',
                width: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'host.name',
                width: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'source.ip',
                width: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'destination.ip',
                width: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'user.name',
                width: 180,
              },
            ],
            dataProviders: [],
            dateRange: {
              end: '2018-11-05T19:03:25.937Z',
              start: '2018-11-05T18:58:25.937Z',
            },
            deletedEventIds: [],
            description: 'This is a sample rule description',
            eventIdToNoteIds: {},
            eventType: 'all',
            excludedRowRendererIds: [],
            expandedEvent: {},
            filters: [
              {
                $state: {
                  store: 'appState',
                },
                meta: {
                  key: 'host.name',
                  negate: false,
                  params: {
                    query: 'apache',
                  },
                  type: 'phrase',
                },
                query: {
                  match_phrase: {
                    'host.name': 'apache',
                  },
                },
              },
            ],
            highlightedDropAndProviderId: '',
            historyIds: [],
            id: '',
            indexNames: [],
            isFavorite: false,
            isLive: false,
            isLoading: false,
            isSaving: false,
            isSelectAllChecked: false,
            itemsPerPage: 25,
            itemsPerPageOptions: [10, 25, 50, 100],
            kqlMode: 'filter',
            kqlQuery: {
              filterQuery: {
                kuery: {
                  expression: '',
                  kind: 'kuery',
                },
                serializedQuery: '',
              },
            },
            loadingEventIds: [],
            noteIds: [],
            pinnedEventIds: {},
            pinnedEventsSaveObject: {},
            savedObjectId: null,
            selectedEventIds: {},
            show: true,
            showCheckboxes: false,
            sort: [
              {
                columnId: '@timestamp',
                columnType: 'number',
                sortDirection: 'desc',
              },
            ],
            status: TimelineStatus.draft,
            title: '',
            timelineType: TimelineType.default,
            templateTimelineId: null,
            templateTimelineVersion: null,
            version: null,
          },
          to: '2018-11-05T19:03:25.937Z',
          ruleNote: '# this is some markdown documentation',
        };

        expect(createTimeline).toHaveBeenCalledWith(expected);
      });

      test('it invokes createTimeline with kqlQuery.filterQuery.kuery.kind as "kuery" if not specified in returned timeline template', async () => {
        const mockTimelineApolloResultModified = {
          ...mockTimelineApolloResult,
          kqlQuery: {
            filterQuery: {
              kuery: {
                expression: [''],
              },
            },
          },
        };
        jest.spyOn(apolloClient, 'query').mockResolvedValue(mockTimelineApolloResultModified);

        await sendAlertToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });
        const createTimelineArg = (createTimeline as jest.Mock).mock.calls[0][0];

        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimelineArg.timeline.kqlQuery.filterQuery.kuery.kind).toEqual('kuery');
      });

      test('it invokes createTimeline with default timeline if apolloClient throws', async () => {
        jest.spyOn(apolloClient, 'query').mockImplementation(() => {
          throw new Error('Test error');
        });

        await sendAlertToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });

        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: TimelineId.active,
          isLoading: true,
        });
        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: TimelineId.active,
          isLoading: false,
        });
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });

    describe('timelineId is empty string', () => {
      test('it invokes createTimeline with timelineDefaults', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          signal: {
            rule: {
              ...mockEcsDataWithAlert.signal?.rule!,
              // @ts-expect-error
              timeline_id: null,
            },
          },
        };

        await sendAlertToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: ecsDataMock,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });

    describe('apolloClient is not defined', () => {
      test('it invokes createTimeline with timelineDefaults', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          signal: {
            rule: {
              ...mockEcsDataWithAlert.signal?.rule!,
              timeline_id: [''],
            },
          },
        };

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });

    describe('Eql', () => {
      test(' with signal.group.id', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          signal: {
            rule: {
              ...mockEcsDataWithAlert.signal?.rule!,
              type: ['eql'],
              timeline_id: [''],
            },
            group: {
              id: ['my-group-id'],
            },
          },
        };

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith({
          ...defaultTimelineProps,
          timeline: {
            ...defaultTimelineProps.timeline,
            dataProviders: [
              {
                and: [],
                enabled: true,
                excluded: false,
                id:
                  'send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-alert-id-my-group-id',
                kqlQuery: '',
                name: '1',
                queryMatch: { field: 'signal.group.id', operator: ':', value: 'my-group-id' },
              },
            ],
          },
        });
      });

      test(' with NO  signal.group.id', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          signal: {
            rule: {
              ...mockEcsDataWithAlert.signal?.rule!,
              type: ['eql'],
              timeline_id: [''],
            },
          },
        };

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          nonEcsData: [],
          updateTimelineIsLoading,
          searchStrategyClient,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });
  });

  describe('determineToAndFrom', () => {
    test('it uses ecs.Data.timestamp if one is provided', () => {
      const ecsDataMock: Ecs = {
        ...mockEcsDataWithAlert,
        timestamp: '2020-03-20T17:59:46.349Z',
      };
      const result = determineToAndFrom({ ecsData: ecsDataMock });

      expect(result.from).toEqual('2020-03-20T17:54:46.349Z');
      expect(result.to).toEqual('2020-03-20T17:59:46.349Z');
    });

    test('it uses current time timestamp if ecsData.timestamp is not provided', () => {
      const { timestamp, ...ecsDataMock } = {
        ...mockEcsDataWithAlert,
      };
      const result = determineToAndFrom({ ecsData: ecsDataMock });

      expect(result.from).toEqual('2020-03-01T17:54:46.349Z');
      expect(result.to).toEqual('2020-03-01T17:59:46.349Z');
    });
  });
});

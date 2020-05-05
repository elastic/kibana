/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import moment from 'moment';

import { sendSignalToTimelineAction, determineToAndFrom } from './actions';
import {
  mockEcsDataWithSignal,
  defaultTimelineProps,
  apolloClient,
  mockTimelineApolloResult,
} from '../../../../mock/';
import { CreateTimeline, UpdateTimelineLoading } from './types';
import { Ecs } from '../../../../graphql/types';

jest.mock('apollo-client');

describe('signals actions', () => {
  const anchor = '2020-03-01T17:59:46.349Z';
  const unix = moment(anchor).valueOf();
  let createTimeline: CreateTimeline;
  let updateTimelineIsLoading: UpdateTimelineLoading;
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

    jest.spyOn(apolloClient, 'query').mockResolvedValue(mockTimelineApolloResult);

    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('sendSignalToTimelineAction', () => {
    describe('timeline id is NOT empty string and apollo client exists', () => {
      test('it invokes updateTimelineIsLoading to set to true', async () => {
        await sendSignalToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithSignal,
          updateTimelineIsLoading,
        });

        expect(updateTimelineIsLoading).toHaveBeenCalledTimes(1);
        expect(updateTimelineIsLoading).toHaveBeenCalledWith({ id: 'timeline-1', isLoading: true });
      });

      test('it invokes createTimeline with designated timeline template if "timelineTemplate" exists', async () => {
        await sendSignalToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithSignal,
          updateTimelineIsLoading,
        });
        const expected = {
          from: 1541444305937,
          timeline: {
            columns: [
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: '@timestamp',
                placeholder: undefined,
                type: undefined,
                width: 190,
              },
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: 'message',
                placeholder: undefined,
                type: undefined,
                width: 180,
              },
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: 'event.category',
                placeholder: undefined,
                type: undefined,
                width: 180,
              },
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: 'host.name',
                placeholder: undefined,
                type: undefined,
                width: 180,
              },
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: 'source.ip',
                placeholder: undefined,
                type: undefined,
                width: 180,
              },
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: 'destination.ip',
                placeholder: undefined,
                type: undefined,
                width: 180,
              },
              {
                aggregatable: undefined,
                category: undefined,
                columnHeaderType: 'not-filtered',
                description: undefined,
                example: undefined,
                id: 'user.name',
                placeholder: undefined,
                type: undefined,
                width: 180,
              },
            ],
            dataProviders: [],
            dateRange: {
              end: 1541444605937,
              start: 1541444305937,
            },
            deletedEventIds: [],
            description: 'This is a sample rule description',
            eventIdToNoteIds: {},
            eventType: 'all',
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
              filterQueryDraft: {
                expression: '',
                kind: 'kuery',
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
            showRowRenderers: true,
            sort: {
              columnId: '@timestamp',
              sortDirection: 'desc',
            },
            title: '',
            version: null,
            width: 1100,
          },
          to: 1541444605937,
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
            filterQueryDraft: {
              expression: [''],
            },
          },
        };
        jest.spyOn(apolloClient, 'query').mockResolvedValue(mockTimelineApolloResultModified);

        await sendSignalToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithSignal,
          updateTimelineIsLoading,
        });
        // @ts-ignore
        const createTimelineArg = createTimeline.mock.calls[0][0];

        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimelineArg.timeline.kqlQuery.filterQuery.kuery.kind).toEqual('kuery');
      });

      test('it invokes createTimeline with kqlQuery.filterQueryDraft.kuery.kind as "kuery" if not specified in returned timeline template', async () => {
        const mockTimelineApolloResultModified = {
          ...mockTimelineApolloResult,
          kqlQuery: {
            filterQuery: {
              kuery: {
                expression: [''],
              },
            },
            filterQueryDraft: {
              expression: [''],
            },
          },
        };
        jest.spyOn(apolloClient, 'query').mockResolvedValue(mockTimelineApolloResultModified);

        await sendSignalToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithSignal,
          updateTimelineIsLoading,
        });
        // @ts-ignore
        const createTimelineArg = createTimeline.mock.calls[0][0];

        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimelineArg.timeline.kqlQuery.filterQueryDraft.kind).toEqual('kuery');
      });

      test('it invokes createTimeline with default timeline if apolloClient throws', async () => {
        jest.spyOn(apolloClient, 'query').mockImplementation(() => {
          throw new Error('Test error');
        });

        await sendSignalToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: mockEcsDataWithSignal,
          updateTimelineIsLoading,
        });

        expect(updateTimelineIsLoading).toHaveBeenCalledWith({ id: 'timeline-1', isLoading: true });
        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: 'timeline-1',
          isLoading: false,
        });
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });

    describe('timelineId is empty string', () => {
      test('it invokes createTimeline with timelineDefaults', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithSignal,
          signal: {
            rule: {
              ...mockEcsDataWithSignal.signal?.rule!,
              timeline_id: null,
            },
          },
        };

        await sendSignalToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData: ecsDataMock,
          updateTimelineIsLoading,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });

    describe('apolloClient is not defined', () => {
      test('it invokes createTimeline with timelineDefaults', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithSignal,
          signal: {
            rule: {
              ...mockEcsDataWithSignal.signal?.rule!,
              timeline_id: [''],
            },
          },
        };

        await sendSignalToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          updateTimelineIsLoading,
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
        ...mockEcsDataWithSignal,
        timestamp: '2020-03-20T17:59:46.349Z',
      };
      const result = determineToAndFrom({ ecsData: ecsDataMock });

      expect(result.from).toEqual(1584726886349);
      expect(result.to).toEqual(1584727186349);
    });

    test('it uses current time timestamp if ecsData.timestamp is not provided', () => {
      const { timestamp, ...ecsDataMock } = {
        ...mockEcsDataWithSignal,
      };
      const result = determineToAndFrom({ ecsData: ecsDataMock });

      expect(result.from).toEqual(1583085286349);
      expect(result.to).toEqual(1583085586349);
    });
  });
});

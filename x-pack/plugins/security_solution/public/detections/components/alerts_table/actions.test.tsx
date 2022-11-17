/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import moment from 'moment';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';

import {
  sendAlertToTimelineAction,
  sendBulkEventsToTimelineAction,
  determineToAndFrom,
} from './actions';
import {
  defaultTimelineProps,
  getThresholdDetectionAlertAADMock,
  mockEcsDataWithAlert,
  mockTimelineDetails,
  mockTimelineResult,
  mockAADEcsDataWithAlert,
  mockGetOneTimelineResult,
  mockTimelineData,
} from '../../../common/mock';
import type { CreateTimeline, UpdateTimelineLoading } from './types';
import type { Ecs } from '../../../../common/ecs';
import type { DataProvider } from '../../../../common/types/timeline';
import {
  TimelineId,
  TimelineType,
  TimelineStatus,
  TimelineTabs,
} from '../../../../common/types/timeline';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { searchServiceMock } from '@kbn/data-plugin/public/search/mocks';
import { getTimelineTemplate } from '../../../timelines/containers/api';
import { defaultHeaders } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { KibanaServices } from '../../../common/lib/kibana';
import {
  DEFAULT_FROM_MOMENT,
  DEFAULT_TO_MOMENT,
} from '../../../common/utils/default_date_settings';
import {
  COMMENTS,
  DATE_NOW,
  DESCRIPTION,
  ENTRIES,
  ITEM_TYPE,
  META,
  NAME,
  NAMESPACE_TYPE,
  TIE_BREAKER,
  USER,
} from '@kbn/lists-plugin/common/constants.mock';
import { of } from 'rxjs';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

jest.mock('../../../timelines/containers/api', () => ({
  getTimelineTemplate: jest.fn(),
}));

jest.mock('../../../common/lib/kibana');

export const getExceptionListItemSchemaMock = (
  overrides?: Partial<ExceptionListItemSchema>
): ExceptionListItemSchema => ({
  _version: undefined,
  comments: COMMENTS,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  entries: ENTRIES,
  id: '1',
  item_id: 'endpoint_list_item',
  list_id: 'endpoint_list_id',
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  os_types: [],
  tags: ['user added string for a tag', 'malware'],
  tie_breaker_id: TIE_BREAKER,
  type: ITEM_TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
  ...(overrides || {}),
});

const getExpectedcreateTimelineParam = (
  from: string,
  to: string,
  dataProviders: DataProvider[],
  filters: Filter[]
) => ({
  from,
  notes: null,
  timeline: {
    ...timelineDefaults,
    dataProviders,
    id: TimelineId.active,
    indexNames: [],
    dateRange: {
      start: from,
      end: to,
    },
    eventType: 'all',
    filters,
    kqlQuery: {
      filterQuery: {
        kuery: {
          kind: 'kuery',
          expression: '',
        },
        serializedQuery: '',
      },
    },
  },
  to,
});

describe('alert actions', () => {
  const anchor = '2020-03-01T17:59:46.349Z';
  const unix = moment(anchor).valueOf();
  let createTimeline: CreateTimeline;
  let updateTimelineIsLoading: UpdateTimelineLoading;
  let searchStrategyClient: jest.Mocked<ISearchStart>;
  let clock: sinon.SinonFakeTimers;
  let mockKibanaServices: jest.Mock;
  let mockGetExceptionFilter: jest.Mock;
  let fetchMock: jest.Mock;
  let toastMock: jest.Mock;
  const mockEcsData = mockTimelineData.map((item) => item.ecs);
  const eventIds = mockEcsData.map((ecs) => ecs._id);

  const ecsDataMockWithNoTemplateTimeline = getThresholdDetectionAlertAADMock({
    ...mockAADEcsDataWithAlert,
    kibana: {
      alert: {
        ...mockAADEcsDataWithAlert.kibana?.alert,
        rule: {
          ...mockAADEcsDataWithAlert.kibana?.alert?.rule,
          parameters: {
            ...mockAADEcsDataWithAlert.kibana?.alert?.rule?.parameters,
            threshold: {
              field: ['destination.ip'],
              value: 1,
            },
          },
          name: ['mock threshold rule'],
          saved_id: [],
          type: ['threshold'],
          uuid: ['c5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
          timeline_id: undefined,
          timeline_title: undefined,
        },
        threshold_result: {
          count: 99,
          from: '2021-01-10T21:11:45.839Z',
          cardinality: [
            {
              field: 'source.ip',
              value: 1,
            },
          ],
          terms: [
            {
              field: 'destination.ip',
              value: 1,
            },
          ],
        },
      },
    },
  });

  const ecsDataMockWithNoTemplateTimelineAndNoFilters = getThresholdDetectionAlertAADMock({
    ...mockAADEcsDataWithAlert,
    kibana: {
      alert: {
        ...mockAADEcsDataWithAlert.kibana?.alert,
        rule: {
          ...mockAADEcsDataWithAlert.kibana?.alert?.rule,
          parameters: {
            ...mockAADEcsDataWithAlert.kibana?.alert?.rule?.parameters,
            threshold: {
              field: ['destination.ip'],
              value: 1,
            },
            filters: undefined,
          },
          name: ['mock threshold rule'],
          saved_id: [],
          type: ['threshold'],
          uuid: ['c5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
          timeline_id: undefined,
          timeline_title: undefined,
        },
        threshold_result: {
          count: 99,
          from: '2021-01-10T21:11:45.839Z',
          cardinality: [
            {
              field: 'source.ip',
              value: 1,
            },
          ],
          terms: [
            {
              field: 'destination.ip',
              value: 1,
            },
          ],
        },
      },
    },
  });

  const ecsDataMockWithTemplateTimeline = getThresholdDetectionAlertAADMock({
    ...mockAADEcsDataWithAlert,
    kibana: {
      alert: {
        ...mockAADEcsDataWithAlert.kibana?.alert,
        rule: {
          ...mockAADEcsDataWithAlert.kibana?.alert?.rule,
          parameters: {
            ...mockAADEcsDataWithAlert.kibana?.alert?.rule?.parameters,
            threshold: {
              field: ['destination.ip'],
              value: 1,
            },
            filters: undefined,
          },
          name: ['mock threshold rule'],
          saved_id: [],
          type: ['threshold'],
          uuid: ['c5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
          timeline_id: ['timeline-id'],
          timeline_title: ['timeline-title'],
        },
        threshold_result: {
          count: 99,
          from: '2021-01-10T21:11:45.839Z',
          cardinality: [
            {
              field: 'source.ip',
              value: 1,
            },
          ],
          terms: [
            {
              field: 'destination.ip',
              value: 1,
            },
          ],
        },
      },
    },
  });

  beforeEach(() => {
    // jest carries state between mocked implementations when using
    // spyOn. So now we're doing all three of these.
    // https://github.com/facebook/jest/issues/7136#issuecomment-565976599
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockGetExceptionFilter = jest.fn().mockResolvedValue(undefined);

    createTimeline = jest.fn() as jest.Mocked<CreateTimeline>;
    updateTimelineIsLoading = jest.fn() as jest.Mocked<UpdateTimelineLoading>;
    mockKibanaServices = KibanaServices.get as jest.Mock;

    fetchMock = jest.fn();
    toastMock = jest.fn();
    mockKibanaServices.mockReturnValue({
      http: { fetch: fetchMock },
      notifications: { toasts: { addError: toastMock } },
    });

    searchStrategyClient = {
      ...searchServiceMock.createStartContract(),
      search: jest.fn().mockImplementation(() => of({ data: mockTimelineDetails })),
    };

    (getTimelineTemplate as jest.Mock).mockResolvedValue(mockTimelineResult);

    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('sendAlertToTimelineAction', () => {
    describe('timeline id is NOT empty string and apollo client exists', () => {
      test('it invokes updateTimelineIsLoading to set to true', async () => {
        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
        expect(updateTimelineIsLoading).toHaveBeenCalledTimes(1);
        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: TimelineId.active,
          isLoading: true,
        });
      });

      test('it invokes createTimeline with designated timeline template if "timelineTemplate" exists', async () => {
        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });
        const expected = {
          from: '2018-11-05T18:58:25.937Z',
          notes: null,
          timeline: {
            activeTab: TimelineTabs.query,
            prevActiveTab: TimelineTabs.query,
            columns: [
              {
                columnHeaderType: 'not-filtered',
                id: '@timestamp',
                type: 'date',
                esTypes: ['date'],
                initialWidth: 190,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'message',
                initialWidth: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'event.category',
                initialWidth: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'host.name',
                initialWidth: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'source.ip',
                initialWidth: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'destination.ip',
                initialWidth: 180,
              },
              {
                columnHeaderType: 'not-filtered',
                id: 'user.name',
                initialWidth: 180,
              },
            ],
            defaultColumns: defaultHeaders,
            dataProviders: [],
            dataViewId: null,
            dateRange: {
              end: '2018-11-05T19:03:25.937Z',
              start: '2018-11-05T18:58:25.937Z',
            },
            deletedEventIds: [],
            description: 'This is a sample rule description',
            documentType: '',
            eqlOptions: {
              eventCategoryField: 'event.category',
              query: '',
              size: 100,
              tiebreakerField: '',
              timestampField: '@timestamp',
            },
            eventIdToNoteIds: {},
            eventType: 'all',
            excludedRowRendererIds: [],
            expandedDetail: {},
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
            queryFields: [],
            resolveTimelineConfig: undefined,
            savedObjectId: null,
            selectedEventIds: {},
            sessionViewConfig: null,
            show: true,
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

        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledWith(expected);
      });

      test('it invokes createTimeline with kqlQuery.filterQuery.kuery.kind as "kuery" if not specified in returned timeline template', async () => {
        const mockTimelineResultModified = {
          ...mockTimelineResult,
          kqlQuery: {
            filterQuery: {
              kuery: {
                expression: [''],
              },
            },
          },
        };
        (getTimelineTemplate as jest.Mock).mockResolvedValue(mockTimelineResultModified);

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });
        const createTimelineArg = (createTimeline as jest.Mock).mock.calls[0][0];

        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimelineArg.timeline.kqlQuery.filterQuery.kuery.kind).toEqual('kuery');
      });

      test('it invokes createTimeline with default timeline if apolloClient throws', async () => {
        (getTimelineTemplate as jest.Mock).mockImplementation(() => {
          throw new Error('Test error');
        });

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: mockEcsDataWithAlert,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });
        const defaultTimelinePropsWithoutNote = { ...defaultTimelineProps };

        delete defaultTimelinePropsWithoutNote.ruleNote;

        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: TimelineId.active,
          isLoading: true,
        });
        expect(updateTimelineIsLoading).toHaveBeenCalledWith({
          id: TimelineId.active,
          isLoading: false,
        });
        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith({
          ...defaultTimelinePropsWithoutNote,
          timeline: {
            ...defaultTimelinePropsWithoutNote.timeline,
            dataProviders: [],
            kqlQuery: {
              filterQuery: null,
            },
            resolveTimelineConfig: undefined,
          },
        });
      });
    });

    describe('timelineId is empty string', () => {
      test('it invokes createTimeline with timelineDefaults', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          signal: {
            rule: {
              ...mockEcsDataWithAlert.signal?.rule,
              timeline_id: [''],
            },
          },
        };

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
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
              ...mockEcsDataWithAlert.signal?.rule,
              timeline_id: [''],
            },
          },
        };

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
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
              ...mockEcsDataWithAlert.signal?.rule,
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
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith({
          ...defaultTimelineProps,
          timeline: {
            ...defaultTimelineProps.timeline,
            resolveTimelineConfig: undefined,
            dataProviders: [
              {
                and: [],
                enabled: true,
                excluded: false,
                id: 'send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-alert-id-my-group-id',
                kqlQuery: '',
                name: '1',
                queryMatch: { field: 'signal.group.id', operator: ':', value: 'my-group-id' },
              },
            ],
          },
        });
      });

      test(' with NO signal.group.id', async () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          signal: {
            rule: {
              ...mockEcsDataWithAlert.signal?.rule,
              type: ['eql'],
              timeline_id: [''],
            },
          },
        };

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMock,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(mockGetExceptionFilter).not.toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(defaultTimelineProps);
      });
    });

    describe('Threshold', () => {
      test('Exceptions and filters are included', async () => {
        fetchMock.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: ecsDataMockWithNoTemplateTimeline[0]._id,
                _index: 'mock',
                _source: ecsDataMockWithNoTemplateTimeline[0],
              },
            ],
          },
        });
        mockGetExceptionFilter.mockResolvedValue({
          meta: {
            alias: 'Exceptions',
            disabled: false,
            negate: true,
          },
          query: {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      {
                        nested: {
                          path: 'some.parentField',
                          query: {
                            bool: {
                              minimum_should_match: 1,
                              should: [
                                {
                                  match_phrase: {
                                    'some.parentField.nested.field': 'some value',
                                  },
                                },
                              ],
                            },
                          },
                          score_mode: 'none',
                        },
                      },
                      {
                        bool: {
                          minimum_should_match: 1,
                          should: [
                            {
                              match_phrase: {
                                'some.not.nested.field': 'some value',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        });
        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMockWithNoTemplateTimeline,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        const expectedFrom = '2021-01-10T21:11:45.839Z';
        const expectedTo = '2021-01-10T21:12:45.839Z';

        expect(updateTimelineIsLoading).not.toHaveBeenCalled();
        expect(mockGetExceptionFilter).toHaveBeenCalled();
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
                id: 'send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-destination-ip-1',
                kqlQuery: '',
                name: 'destination.ip',
                queryMatch: { field: 'destination.ip', operator: ':', value: 1 },
              },
            ],
            dateRange: {
              start: expectedFrom,
              end: expectedTo,
            },
            description: '_id: 1',
            filters: [
              {
                meta: {
                  key: 'host.name',
                  negate: false,
                  params: '"{"query":"placeholder"}"',
                  type: 'phrase',
                },
                query: { match_phrase: { 'host.name': 'placeholder' } },
              },
              {
                // https://github.com/elastic/kibana/issues/126574 - if the provided filter has no `meta` field
                // we expect an empty object to be inserted before calling `createTimeline`
                meta: {},
                query: { match_all: {} },
              },
              {
                meta: {
                  alias: 'Exceptions',
                  disabled: false,
                  negate: true,
                },
                query: {
                  bool: {
                    should: [
                      {
                        bool: {
                          filter: [
                            {
                              nested: {
                                path: 'some.parentField',
                                query: {
                                  bool: {
                                    minimum_should_match: 1,
                                    should: [
                                      {
                                        match_phrase: {
                                          'some.parentField.nested.field': 'some value',
                                        },
                                      },
                                    ],
                                  },
                                },
                                score_mode: 'none',
                              },
                            },
                            {
                              bool: {
                                minimum_should_match: 1,
                                should: [
                                  {
                                    match_phrase: {
                                      'some.not.nested.field': 'some value',
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            ],
            kqlQuery: {
              filterQuery: {
                kuery: {
                  expression: ['user.id:1'],
                  kind: ['kuery'],
                },
                serializedQuery: ['user.id:1'],
              },
            },
            resolveTimelineConfig: undefined,
          },
          from: expectedFrom,
          to: expectedTo,
        });
      });

      test('Does not crash when no filters provided', async () => {
        fetchMock.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: ecsDataMockWithNoTemplateTimelineAndNoFilters[0]._id,
                _index: 'mock',
                _source: ecsDataMockWithNoTemplateTimelineAndNoFilters[0],
              },
            ],
          },
        });
        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMockWithNoTemplateTimelineAndNoFilters,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        expect(createTimeline).not.toThrow();
        expect(toastMock).not.toHaveBeenCalled();
      });

      test('columns from timeline template are used', async () => {
        fetchMock.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: ecsDataMockWithTemplateTimeline[0]._id,
                _index: 'mock',
                _source: ecsDataMockWithTemplateTimeline[0],
              },
            ],
          },
        });

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMockWithTemplateTimeline,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });

        const expectedFrom = '2021-01-10T21:11:45.839Z';
        const expectedTo = '2021-01-10T21:12:45.839Z';

        expect(updateTimelineIsLoading).toHaveBeenCalled();
        expect(mockGetExceptionFilter).toHaveBeenCalled();
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith({
          ...defaultTimelineProps,
          timeline: {
            ...defaultTimelineProps.timeline,
            columns: mockGetOneTimelineResult.columns,
            dataProviders: [],
            dateRange: {
              start: expectedFrom,
              end: expectedTo,
            },
            description: '_id: 1',
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
            kqlQuery: {
              filterQuery: {
                kuery: {
                  expression: '',
                  kind: ['kuery'],
                },
                serializedQuery: '',
              },
            },
            resolveTimelineConfig: undefined,
          },
          from: expectedFrom,
          to: expectedTo,
        });
      });
    });

    describe('determineToAndFrom', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValue({
          hits: {
            hits: [
              {
                _id: ecsDataMockWithNoTemplateTimeline[0]._id,
                _index: 'mock',
                _source: ecsDataMockWithNoTemplateTimeline[0],
              },
            ],
          },
        });
      });

      test('it uses ecs.Data.timestamp if one is provided', () => {
        const ecsDataMock: Ecs = {
          ...mockEcsDataWithAlert,
          timestamp: '2020-03-20T17:59:46.349Z',
        };
        const result = determineToAndFrom({ ecs: ecsDataMock });

        expect(result.from).toEqual('2020-03-20T17:54:46.349Z');
        expect(result.to).toEqual('2020-03-20T17:59:46.349Z');
      });

      test('it uses current time timestamp if ecsData.timestamp is not provided', () => {
        const { timestamp, ...ecsDataMock } = mockEcsDataWithAlert;
        const result = determineToAndFrom({ ecs: ecsDataMock });

        expect(result.from).toEqual('2020-03-01T17:54:46.349Z');
        expect(result.to).toEqual('2020-03-01T17:59:46.349Z');
      });

      test('it uses original_time and threshold_result.from for threshold alerts', async () => {
        const expectedFrom = '2021-01-10T21:11:45.839Z';
        const expectedTo = '2021-01-10T21:12:45.839Z';

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMockWithNoTemplateTimeline,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith({
          ...defaultTimelineProps,
          timeline: {
            ...defaultTimelineProps.timeline,
            filters: [
              {
                meta: {
                  key: 'host.name',
                  negate: false,
                  params: '"{"query":"placeholder"}"',
                  type: 'phrase',
                },
                query: { match_phrase: { 'host.name': 'placeholder' } },
              },
              {
                meta: {},
                query: { match_all: {} },
              },
            ],
            dataProviders: [
              {
                and: [],
                enabled: true,
                excluded: false,
                id: 'send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-timeline-1-destination-ip-1',
                kqlQuery: '',
                name: 'destination.ip',
                queryMatch: { field: 'destination.ip', operator: ':', value: 1 },
              },
            ],
            dateRange: {
              start: expectedFrom,
              end: expectedTo,
            },
            description: '_id: 1',
            kqlQuery: {
              filterQuery: {
                kuery: {
                  expression: ['user.id:1'],
                  kind: ['kuery'],
                },
                serializedQuery: ['user.id:1'],
              },
            },
            resolveTimelineConfig: undefined,
          },
          from: expectedFrom,
          to: expectedTo,
        });
      });
    });

    describe('show toasts when data is malformed', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValue({
          hits: 'not correctly formed doc',
        });
      });

      test('renders a toast and calls create timeline with basic defaults', async () => {
        const expectedFrom = DEFAULT_FROM_MOMENT.toISOString();
        const expectedTo = DEFAULT_TO_MOMENT.toISOString();
        const timelineProps = {
          ...defaultTimelineProps,
          timeline: {
            ...defaultTimelineProps.timeline,
            dataProviders: [],
            dateRange: {
              start: expectedFrom,
              end: expectedTo,
            },
            description: '',
            kqlQuery: {
              filterQuery: null,
            },
            resolveTimelineConfig: undefined,
          },
          from: expectedFrom,
          to: expectedTo,
        };

        delete timelineProps.ruleNote;

        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsDataMockWithNoTemplateTimeline,
          updateTimelineIsLoading,
          searchStrategyClient,
          getExceptionFilter: mockGetExceptionFilter,
        });
        expect(createTimeline).toHaveBeenCalledTimes(1);
        expect(createTimeline).toHaveBeenCalledWith(timelineProps);
        expect(toastMock).toHaveBeenCalled();
      });
    });
  });

  describe('sendBulkEventsToTimelineAction', () => {
    test('send multiple events to timeline  with dataProviders preference ', () => {
      sendBulkEventsToTimelineAction(createTimeline, mockEcsData, 'dataProvider');
      const { from, to } = determineToAndFrom({ ecs: mockEcsData });
      const expectedDataProviders: DataProvider[] = [
        {
          and: [],
          id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${
            TimelineId.active
          }-alert-id-${eventIds.join(',')}`,
          name: eventIds.join(','),
          enabled: true,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: '_id',
            // @ts-ignore till https://github.com/elastic/kibana/pull/142436 is merged
            value: eventIds,
            // @ts-ignore till https://github.com/elastic/kibana/pull/142436 is merged
            operator: 'includes',
          },
        },
      ];
      const expected = getExpectedcreateTimelineParam(from, to, expectedDataProviders, []);
      expect(createTimeline).toHaveBeenCalledWith(expected);
    });

    test('send single event to timeline with data provider preference', () => {
      const mockEcsDataModified = mockEcsData.slice(0, 1);
      sendBulkEventsToTimelineAction(createTimeline, mockEcsDataModified);
      const { from, to } = determineToAndFrom({ ecs: mockEcsDataModified });
      const expectedDataProviders: DataProvider[] = [
        {
          and: [],
          id: `send-alert-to-timeline-action-default-draggable-event-details-value-formatted-field-value-${TimelineId.active}-alert-id-${eventIds[0]}`,
          name: eventIds[0],
          enabled: true,
          excluded: false,
          kqlQuery: '',
          queryMatch: {
            field: '_id',
            value: eventIds[0],
            operator: ':',
          },
        },
      ];
      const expected = getExpectedcreateTimelineParam(from, to, expectedDataProviders, []);
      expect(createTimeline).toHaveBeenCalledWith(expected);
    });
    test('send single event to timeline with filter preference', () => {
      const mockEcsDataModified = mockEcsData.slice(0, 1);
      sendBulkEventsToTimelineAction(createTimeline, mockEcsDataModified, 'KqlFilter');
      const { from, to } = determineToAndFrom({ ecs: mockEcsDataModified });
      const expectedDataProviders: DataProvider[] = [];
      const expectedFilters: Filter[] = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: '_id',
            params: {
              query: eventIds[0],
            },
          },
          query: {
            match_phrase: {
              _id: eventIds[0],
            },
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
      ];
      const expected = getExpectedcreateTimelineParam(
        from,
        to,
        expectedDataProviders,
        expectedFilters
      );
      expect(createTimeline).toHaveBeenCalledWith(expected);
    });

    test('send multiple events to timeline with filter preference without label', () => {
      sendBulkEventsToTimelineAction(createTimeline, mockEcsData, 'KqlFilter');
      const { from, to } = determineToAndFrom({ ecs: mockEcsData });
      const expectedDataProviders: DataProvider[] = [];
      const expectedFilters: Filter[] = [
        {
          query: {
            bool: {
              filter: {
                ids: {
                  values: eventIds,
                },
              },
            },
          },
          meta: {
            alias: `${mockEcsData.length} event IDs`,
            negate: false,
            disabled: false,
            type: 'phrases',
            key: '_id',
            value: eventIds.join(),
            params: eventIds,
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
      ];
      const expected = getExpectedcreateTimelineParam(
        from,
        to,
        expectedDataProviders,
        expectedFilters
      );
      expect(createTimeline).toHaveBeenCalledWith(expected);
    });

    test('send multiple events to timeline with filter preference with label', () => {
      sendBulkEventsToTimelineAction(createTimeline, mockEcsData, 'KqlFilter', 'test-label');
      const { from, to } = determineToAndFrom({ ecs: mockEcsData });
      const expectedDataProviders: DataProvider[] = [];
      const expectedFilters: Filter[] = [
        {
          query: {
            bool: {
              filter: {
                ids: {
                  values: eventIds,
                },
              },
            },
          },
          meta: {
            alias: 'test-label',
            negate: false,
            disabled: false,
            type: 'phrases',
            key: '_id',
            value: eventIds.join(),
            params: eventIds,
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
      ];
      const expected = getExpectedcreateTimelineParam(
        from,
        to,
        expectedDataProviders,
        expectedFilters
      );
      expect(createTimeline).toHaveBeenCalledWith(expected);
    });
  });
});

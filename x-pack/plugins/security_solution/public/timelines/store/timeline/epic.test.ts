/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore, Filter } from '@kbn/es-query';
import { Direction } from '../../../../common/search_strategy';
import { TimelineType, TimelineStatus, TimelineTabs } from '../../../../common/types/timeline';
import { convertTimelineAsInput } from './epic';
import { TimelineModel } from './model';

describe('Epic Timeline', () => {
  describe('#convertTimelineAsInput ', () => {
    test('should return a TimelineInput instead of TimelineModel ', () => {
      const columns: TimelineModel['columns'] = [
        {
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
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
          id: 'event.action',
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
      ];
      const timelineModel: TimelineModel = {
        activeTab: TimelineTabs.query,
        prevActiveTab: TimelineTabs.notes,
        columns,
        defaultColumns: columns,
        dataProviders: [
          {
            id: 'hosts-table-hostName-DESKTOP-QBBSCUT',
            name: 'DESKTOP-QBBSCUT',
            enabled: true,
            excluded: false,
            kqlQuery: '',
            queryMatch: {
              field: 'host.name',
              value: 'DESKTOP-QBBSCUT',
              operator: ':',
            },
            and: [
              {
                id: 'plain-column-renderer-data-provider-hosts-page-event_module-CQg7I24BHe9nqdOi_LYL-event_module-endgame',
                name: 'event.module: endgame',
                enabled: true,
                excluded: false,
                kqlQuery: '',
                queryMatch: {
                  field: 'event.module',
                  value: 'endgame',
                  operator: ':',
                },
              },
            ],
          },
        ],
        dataViewId: null,
        deletedEventIds: [],
        description: '',
        documentType: '',
        eqlOptions: {
          eventCategoryField: 'event.category',
          tiebreakerField: '',
          timestampField: '@timestamp',
        },
        eventIdToNoteIds: {},
        eventType: 'all',
        expandedDetail: {},
        excludedRowRendererIds: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        filters: [
          {
            $state: { store: FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: 'event.category',
              negate: false,
              params: { query: 'file' },
              type: 'phrase',
            },
            query: { match_phrase: { 'event.category': 'file' } },
          },
          {
            $state: { store: FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: '@timestamp',
              negate: false,
              type: 'exists',
              value: 'exists',
            },
            query: { exists: { field: '@timestamp' } },
          } as Filter,
        ],
        indexNames: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        isSaving: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: { kind: 'kuery', expression: 'endgame.user_name : "zeus" ' },
            serializedQuery:
              '{"bool":{"should":[{"match_phrase":{"endgame.user_name":"zeus"}}],"minimum_should_match":1}}',
          },
        },
        loadingEventIds: [],
        queryFields: [],
        selectAll: false,
        title: 'saved',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        noteIds: [],
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        dateRange: { start: '2019-10-30T21:06:27.644Z', end: '2019-10-31T21:06:27.644Z' },
        savedObjectId: '11169110-fc22-11e9-8ca9-072f15ce2685',
        selectedEventIds: {},
        show: true,
        showCheckboxes: false,
        sort: [{ columnId: '@timestamp', columnType: 'number', sortDirection: Direction.desc }],
        status: TimelineStatus.active,
        version: 'WzM4LDFd',
        id: '11169110-fc22-11e9-8ca9-072f15ce2685',
        savedQueryId: 'my endgame timeline query',
      };

      expect(
        convertTimelineAsInput(timelineModel, {
          kind: 'absolute',
          from: '2019-10-30T21:06:27.644Z',
          fromStr: undefined,
          to: '2019-10-31T21:06:27.644Z',
          toStr: undefined,
        })
      ).toEqual({
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'message',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.category',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'event.action',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'host.name',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'source.ip',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'destination.ip',
          },
          {
            columnHeaderType: 'not-filtered',
            id: 'user.name',
          },
        ],
        dataProviders: [
          {
            and: [
              {
                enabled: true,
                excluded: false,
                id: 'plain-column-renderer-data-provider-hosts-page-event_module-CQg7I24BHe9nqdOi_LYL-event_module-endgame',
                kqlQuery: '',
                name: 'event.module: endgame',
                queryMatch: {
                  field: 'event.module',
                  operator: ':',
                  value: 'endgame',
                },
              },
            ],
            enabled: true,
            excluded: false,
            id: 'hosts-table-hostName-DESKTOP-QBBSCUT',
            kqlQuery: '',
            name: 'DESKTOP-QBBSCUT',
            queryMatch: {
              field: 'host.name',
              operator: ':',
              value: 'DESKTOP-QBBSCUT',
            },
          },
        ],
        dataViewId: null,
        dateRange: {
          end: '2019-10-31T21:06:27.644Z',
          start: '2019-10-30T21:06:27.644Z',
        },
        description: '',
        eqlOptions: {
          eventCategoryField: 'event.category',
          tiebreakerField: '',
          timestampField: '@timestamp',
        },
        eventType: 'all',
        excludedRowRendererIds: [],
        filters: [
          {
            exists: null,
            match_all: null,
            meta: {
              alias: null,
              disabled: false,
              field: null,
              key: 'event.category',
              negate: false,
              params: '{"query":"file"}',
              type: 'phrase',
              value: null,
            },
            query: '{"match_phrase":{"event.category":"file"}}',
            range: null,
            script: null,
          },
          {
            query: '{"exists":{"field":"@timestamp"}}',
            match_all: null,
            meta: {
              alias: null,
              disabled: false,
              field: null,
              key: '@timestamp',
              negate: false,
              params: null,
              type: 'exists',
              value: 'exists',
            },
            range: null,
            script: null,
          },
        ],
        indexNames: [],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: 'endgame.user_name : "zeus" ',
              kind: 'kuery',
            },
            serializedQuery:
              '{"bool":{"should":[{"match_phrase":{"endgame.user_name":"zeus"}}],"minimum_should_match":1}}',
          },
        },
        savedQueryId: 'my endgame timeline query',
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'number',
            sortDirection: 'desc',
          },
        ],
        templateTimelineId: null,
        templateTimelineVersion: null,
        timelineType: TimelineType.default,
        title: 'saved',
        status: TimelineStatus.active,
      });
    });
  });
});

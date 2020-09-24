/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter, esFilters } from '../../../../../../../src/plugins/data/public';
import { TimelineType, TimelineStatus } from '../../../../common/types/timeline';
import { Direction } from '../../../graphql/types';
import { convertTimelineAsInput } from './epic';
import { TimelineModel } from './model';

describe('Epic Timeline', () => {
  describe('#convertTimelineAsInput ', () => {
    test('should return a TimelineInput instead of TimelineModel ', () => {
      const timelineModel: TimelineModel = {
        columns: [
          {
            columnHeaderType: 'not-filtered',
            id: '@timestamp',
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
            id: 'event.action',
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
                id:
                  'plain-column-renderer-data-provider-hosts-page-event_module-CQg7I24BHe9nqdOi_LYL-event_module-endgame',
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
        deletedEventIds: [],
        description: '',
        eventIdToNoteIds: {},
        eventType: 'all',
        excludedRowRendererIds: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        filters: [
          {
            $state: { store: esFilters.FilterStateStore.APP_STATE },
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
            $state: { store: esFilters.FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: '@timestamp',
              negate: false,
              type: 'exists',
              value: 'exists',
            },
            exists: { field: '@timestamp' },
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
          filterQueryDraft: { kind: 'kuery', expression: 'endgame.user_name : "zeus" ' },
        },
        loadingEventIds: [],
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
        sort: { columnId: '@timestamp', sortDirection: Direction.desc },
        status: TimelineStatus.active,
        width: 1100,
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
                id:
                  'plain-column-renderer-data-provider-hosts-page-event_module-CQg7I24BHe9nqdOi_LYL-event_module-endgame',
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
        dateRange: {
          end: '2019-10-31T21:06:27.644Z',
          start: '2019-10-30T21:06:27.644Z',
        },
        description: '',
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
            missing: null,
            query: '{"match_phrase":{"event.category":"file"}}',
            range: null,
            script: null,
          },
          {
            exists: '{"field":"@timestamp"}',
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
            missing: null,
            query: null,
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
        sort: {
          columnId: '@timestamp',
          sortDirection: 'desc',
        },
        templateTimelineId: null,
        templateTimelineVersion: null,
        timelineType: TimelineType.default,
        title: 'saved',
        status: TimelineStatus.active,
      });
    });
  });
});

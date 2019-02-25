/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultWidth } from '../components/timeline/body';
import { Direction, NetworkTopNFlowDirection, NetworkTopNFlowType } from '../graphql/types';
import { State } from '../store';

export const mockGlobalState: State = {
  local: {
    app: {
      notesById: {},
      errors: [
        { id: 'error-id-1', title: 'title-1', message: 'error-message-1' },
        { id: 'error-id-2', title: 'title-2', message: 'error-message-2' },
      ],
    },
    hosts: {
      page: {
        queries: {
          authentications: {
            limit: 10,
          },
          hosts: {
            limit: 10,
          },
          events: {
            limit: 10,
          },
          uncommonProcesses: {
            limit: 10,
          },
        },
        filterQuery: null,
        filterQueryDraft: null,
      },
      details: {
        queries: {
          authentications: {
            limit: 10,
          },
          hosts: {
            limit: 10,
          },
          events: {
            limit: 10,
          },
          uncommonProcesses: {
            limit: 10,
          },
        },
        filterQuery: null,
        filterQueryDraft: null,
      },
    },
    network: {
      page: {
        queries: {
          topNFlow: {
            limit: 10,
            topNFlowType: NetworkTopNFlowType.source,
            topNFlowDirection: NetworkTopNFlowDirection.uniDirectional,
          },
        },
        filterQuery: null,
        filterQueryDraft: null,
      },
      details: {
        filterQuery: null,
        filterQueryDraft: null,
        queries: null,
      },
    },
    inputs: {
      global: {
        timerange: {
          kind: 'absolute',
          from: 0,
          to: 1,
        },
        query: [],
        policy: {
          kind: 'manual',
          duration: 5000,
        },
      },
    },
    dragAndDrop: {
      dataProviders: {},
    },
    timeline: {
      timelineById: {
        test: {
          id: 'test',
          itemsPerPage: 5,
          dataProviders: [],
          description: '',
          eventIdToNoteIds: {},
          highlightedDropAndProviderId: '',
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: {
            filterQuery: null,
            filterQueryDraft: null,
          },
          title: '',
          noteIds: [],
          range: '1 Day',
          show: false,
          pinnedEventIds: {},
          itemsPerPageOptions: [5, 10, 20],
          sort: {
            columnId: 'timestamp',
            sortDirection: Direction.descending,
          },
          width: defaultWidth,
        },
      },
    },
  },
};

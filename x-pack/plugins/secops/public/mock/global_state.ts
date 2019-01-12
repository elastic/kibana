/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultWidth } from '../components/timeline/body';
import { Direction } from '../graphql/types';
import { State } from '../store';

export const mockGlobalState: State = {
  local: {
    app: {
      notesById: {},
      theme: 'dark',
    },
    hosts: {
      query: {
        authorizations: {
          limit: 10,
        },
        hosts: {
          limit: 2,
        },
        events: {
          limit: 10,
        },
        uncommonProcesses: {
          limit: 0,
          upperLimit: 0,
        },
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
          historyIds: [],
          isFavorite: false,
          isLive: false,
          kqlMode: 'filter',
          kqlQuery: '',
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

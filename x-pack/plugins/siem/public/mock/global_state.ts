/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  DomainsFields,
  FlowDirection,
  FlowTarget,
  HostsFields,
  NetworkDnsFields,
  NetworkTopNFlowFields,
  TlsFields,
  UsersFields,
} from '../graphql/types';
import { State } from '../store';

import { defaultHeaders } from './header';
import { DEFAULT_TIMELINE_WIDTH } from '../components/timeline/body/helpers';

export const mockGlobalState: State = {
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
        authentications: { limit: 10 },
        hosts: {
          limit: 10,
          direction: Direction.desc,
          sortField: HostsFields.lastSeen,
        },
        events: { limit: 10 },
        uncommonProcesses: { limit: 10 },
      },
      filterQuery: null,
      filterQueryDraft: null,
    },
    details: {
      queries: {
        authentications: { limit: 10 },
        hosts: {
          limit: 10,
          direction: Direction.desc,
          sortField: HostsFields.lastSeen,
        },
        events: { limit: 10 },
        uncommonProcesses: { limit: 10 },
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
          flowTarget: FlowTarget.source,
          flowDirection: FlowDirection.uniDirectional,
          topNFlowSort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
        },
        dns: {
          limit: 10,
          dnsSortField: { field: NetworkDnsFields.queryCount, direction: Direction.desc },
          isPtrIncluded: false,
        },
      },
      filterQuery: null,
      filterQueryDraft: null,
    },
    details: {
      filterQuery: null,
      filterQueryDraft: null,
      flowTarget: FlowTarget.source,
      queries: {
        domains: {
          limit: 10,
          flowDirection: FlowDirection.uniDirectional,
          domainsSortField: { field: DomainsFields.bytes, direction: Direction.desc },
        },
        tls: {
          limit: 10,
          tlsSortField: { field: TlsFields._id, direction: Direction.desc },
        },
        users: {
          limit: 10,
          usersSortField: { field: UsersFields.name, direction: Direction.asc },
        },
      },
    },
  },
  inputs: {
    global: {
      timerange: { kind: 'relative', fromStr: 'now-24h', toStr: 'now', from: 0, to: 1 },
      linkTo: ['timeline'],
      query: [],
      policy: { kind: 'manual', duration: 300000 },
    },
    timeline: {
      timerange: { kind: 'relative', fromStr: 'now-24h', toStr: 'now', from: 0, to: 1 },
      linkTo: ['global'],
      query: [],
      policy: { kind: 'manual', duration: 300000 },
    },
  },
  dragAndDrop: { dataProviders: {} },
  timeline: {
    timelineById: {
      test: {
        id: 'test',
        columns: defaultHeaders,
        itemsPerPage: 5,
        dataProviders: [],
        description: '',
        eventIdToNoteIds: {},
        highlightedDropAndProviderId: '',
        historyIds: [],
        isFavorite: false,
        isLive: false,
        kqlMode: 'filter',
        kqlQuery: { filterQuery: null, filterQueryDraft: null },
        title: '',
        noteIds: [],
        range: '1 Day',
        show: false,
        pinnedEventIds: {},
        itemsPerPageOptions: [5, 10, 20],
        sort: { columnId: '@timestamp', sortDirection: Direction.desc },
        width: DEFAULT_TIMELINE_WIDTH,
      },
    },
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMELINE_WIDTH } from '../../timelines/components/timeline/body/constants';
import {
  Direction,
  FlowTarget,
  HostsFields,
  NetworkDnsFields,
  NetworkTopTablesFields,
  NetworkTlsFields,
  NetworkUsersFields,
} from '../../../common/search_strategy';
import { State } from '../store';

import { defaultHeaders } from './header';
import {
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_INDEX_PATTERN,
} from '../../../common/constants';
import { networkModel } from '../../network/store';
import { TimelineType, TimelineStatus } from '../../../common/types/timeline';
import { mockManagementState } from '../../management/store/reducer';
import { ManagementState } from '../../management/types';
import { initialSourcererState, SourcererScopeName } from '../store/sourcerer/model';
import { mockBrowserFields, mockDocValueFields } from '../containers/source/mock';
import { mockIndexPattern } from './index_pattern';

export const mockGlobalState: State = {
  app: {
    notesById: {},
    errors: [
      { id: 'error-id-1', title: 'title-1', message: ['error-message-1'] },
      { id: 'error-id-2', title: 'title-2', message: ['error-message-2'] },
    ],
  },
  hosts: {
    page: {
      queries: {
        authentications: { activePage: 0, limit: 10 },
        allHosts: {
          activePage: 0,
          limit: 10,
          direction: Direction.desc,
          sortField: HostsFields.lastSeen,
        },
        events: { activePage: 0, limit: 10 },
        uncommonProcesses: { activePage: 0, limit: 10 },
        anomalies: null,
        alerts: { activePage: 0, limit: 10 },
      },
    },
    details: {
      queries: {
        authentications: { activePage: 0, limit: 10 },
        allHosts: {
          activePage: 0,
          limit: 10,
          direction: Direction.desc,
          sortField: HostsFields.lastSeen,
        },
        events: { activePage: 0, limit: 10 },
        uncommonProcesses: { activePage: 0, limit: 10 },
        anomalies: null,
        alerts: { activePage: 0, limit: 10 },
      },
    },
  },
  network: {
    page: {
      queries: {
        [networkModel.NetworkTableType.topCountriesDestination]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkTableType.topCountriesSource]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkTableType.topNFlowSource]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkTableType.topNFlowDestination]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkTableType.dns]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkDnsFields.queryCount, direction: Direction.desc },
          isPtrIncluded: false,
        },
        [networkModel.NetworkTableType.tls]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTlsFields._id, direction: Direction.desc },
        },
        [networkModel.NetworkTableType.http]: {
          activePage: 0,
          limit: 10,
          sort: { direction: Direction.desc },
        },
        [networkModel.NetworkTableType.alerts]: {
          activePage: 0,
          limit: 10,
        },
      },
    },
    details: {
      flowTarget: FlowTarget.source,
      queries: {
        [networkModel.NetworkDetailsTableType.topCountriesDestination]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkDetailsTableType.topCountriesSource]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkDetailsTableType.topNFlowSource]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkDetailsTableType.topNFlowDestination]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTopTablesFields.bytes_out, direction: Direction.desc },
        },
        [networkModel.NetworkDetailsTableType.tls]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkTlsFields._id, direction: Direction.desc },
        },
        [networkModel.NetworkDetailsTableType.users]: {
          activePage: 0,
          limit: 10,
          sort: { field: NetworkUsersFields.name, direction: Direction.asc },
        },
        [networkModel.NetworkDetailsTableType.http]: {
          activePage: 0,
          limit: 10,
          sort: { direction: Direction.desc },
        },
      },
    },
  },
  inputs: {
    global: {
      timerange: {
        kind: 'relative',
        fromStr: DEFAULT_FROM,
        toStr: DEFAULT_TO,
        from: '2020-07-07T08:20:18.966Z',
        to: '2020-07-08T08:20:18.966Z',
      },
      linkTo: ['timeline'],
      queries: [],
      policy: { kind: DEFAULT_INTERVAL_TYPE, duration: DEFAULT_INTERVAL_VALUE },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
    },
    timeline: {
      timerange: {
        kind: 'relative',
        fromStr: DEFAULT_FROM,
        toStr: DEFAULT_TO,
        from: '2020-07-07T08:20:18.966Z',
        to: '2020-07-08T08:20:18.966Z',
      },
      linkTo: ['global'],
      queries: [],
      policy: { kind: DEFAULT_INTERVAL_TYPE, duration: DEFAULT_INTERVAL_VALUE },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
    },
  },
  dragAndDrop: { dataProviders: {} },
  timeline: {
    showCallOutUnauthorizedMsg: false,
    autoSavedWarningMsg: {
      timelineId: null,
      newTimelineModel: null,
    },
    timelineById: {
      test: {
        deletedEventIds: [],
        id: 'test',
        savedObjectId: null,
        columns: defaultHeaders,
        indexNames: DEFAULT_INDEX_PATTERN,
        itemsPerPage: 5,
        dataProviders: [],
        description: '',
        eventIdToNoteIds: {},
        excludedRowRendererIds: [],
        highlightedDropAndProviderId: '',
        historyIds: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        kqlMode: 'filter',
        kqlQuery: { filterQuery: null, filterQueryDraft: null },
        loadingEventIds: [],
        title: '',
        timelineType: TimelineType.default,
        templateTimelineId: null,
        templateTimelineVersion: null,
        noteIds: [],
        dateRange: {
          start: '2020-07-07T08:20:18.966Z',
          end: '2020-07-08T08:20:18.966Z',
        },
        selectedEventIds: {},
        show: false,
        showCheckboxes: false,
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        itemsPerPageOptions: [5, 10, 20],
        sort: { columnId: '@timestamp', sortDirection: Direction.desc },
        width: DEFAULT_TIMELINE_WIDTH,
        isSaving: false,
        version: null,
        status: TimelineStatus.active,
      },
    },
    insertTimeline: null,
  },
  sourcerer: {
    ...initialSourcererState,
    sourcererScopes: {
      ...initialSourcererState.sourcererScopes,
      [SourcererScopeName.default]: {
        ...initialSourcererState.sourcererScopes[SourcererScopeName.default],
        selectedPatterns: DEFAULT_INDEX_PATTERN,
        browserFields: mockBrowserFields,
        indexPattern: mockIndexPattern,
        docValueFields: mockDocValueFields,
        loading: false,
      },
      [SourcererScopeName.timeline]: {
        ...initialSourcererState.sourcererScopes[SourcererScopeName.timeline],
        selectedPatterns: DEFAULT_INDEX_PATTERN,
        browserFields: mockBrowserFields,
        indexPattern: mockIndexPattern,
        docValueFields: mockDocValueFields,
        loading: false,
      },
    },
  },
  /**
   * These state's are wrapped in `Immutable`, but for compatibility with the overall app architecture,
   * they are cast to mutable versions here.
   */
  management: mockManagementState as ManagementState,
};

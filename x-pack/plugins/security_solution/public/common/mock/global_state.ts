/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Direction,
  FlowTarget,
  HostsFields,
  NetworkDnsFields,
  NetworkTopTablesFields,
  NetworkTlsFields,
  NetworkUsersFields,
  RiskScoreFields,
} from '../../../common/search_strategy';
import { State } from '../store';

import { defaultHeaders } from './header';
import {
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_SIGNALS_INDEX,
} from '../../../common/constants';
import { networkModel } from '../../network/store';
import { TimelineType, TimelineStatus, TimelineTabs } from '../../../common/types/timeline';
import { mockManagementState } from '../../management/store/reducer';
import { ManagementState } from '../../management/types';
import { initialSourcererState, SourcererScopeName } from '../store/sourcerer/model';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import { getScopePatternListSelection } from '../store/sourcerer/helpers';
import {
  mockBrowserFields,
  mockDocValueFields,
  mockIndexFields,
  mockRuntimeMappings,
} from '../containers/source/mock';
import { usersModel } from '../../users/store';

export const mockSourcererState = {
  ...initialSourcererState,
  signalIndexName: `${DEFAULT_SIGNALS_INDEX}-spacename`,
  defaultDataView: {
    ...initialSourcererState.defaultDataView,
    browserFields: mockBrowserFields,
    docValueFields: mockDocValueFields,
    id: DEFAULT_DATA_VIEW_ID,
    indexFields: mockIndexFields,
    loading: false,
    patternList: [...DEFAULT_INDEX_PATTERN, `${DEFAULT_SIGNALS_INDEX}-spacename`],
    runtimeMappings: mockRuntimeMappings,
    title: [...DEFAULT_INDEX_PATTERN, `${DEFAULT_SIGNALS_INDEX}-spacename`].join(','),
  },
};

export const mockGlobalState: State = {
  app: {
    notesById: {},
    errors: [
      { id: 'error-id-1', title: 'title-1', message: ['error-message-1'] },
      { id: 'error-id-2', title: 'title-2', message: ['error-message-2'] },
    ],
    enableExperimental: allowedExperimentalValues,
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
        externalAlerts: { activePage: 0, limit: 10 },
        hostRisk: {
          activePage: 0,
          limit: 10,
          sort: { field: RiskScoreFields.riskScore, direction: Direction.desc },
          severitySelection: [],
        },
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
        externalAlerts: { activePage: 0, limit: 10 },
        hostRisk: {
          activePage: 0,
          limit: 10,
          sort: { field: RiskScoreFields.riskScore, direction: Direction.desc },
          severitySelection: [],
        },
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
  users: {
    page: {
      queries: {
        [usersModel.UsersTableType.allUsers]: {
          activePage: 0,
          limit: 10,
        },
        [usersModel.UsersTableType.anomalies]: null,
        [usersModel.UsersTableType.risk]: {
          activePage: 0,
          limit: 10,
          sort: {
            field: RiskScoreFields.timestamp,
            direction: Direction.asc,
          },
          severitySelection: [],
        },
        [usersModel.UsersTableType.events]: { activePage: 0, limit: 10 },
        [usersModel.UsersTableType.alerts]: { activePage: 0, limit: 10 },
      },
    },
    details: {
      queries: {
        [usersModel.UsersTableType.anomalies]: null,
        [usersModel.UsersTableType.events]: { activePage: 0, limit: 10 },
        [usersModel.UsersTableType.alerts]: { activePage: 0, limit: 10 },
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
        activeTab: TimelineTabs.query,
        prevActiveTab: TimelineTabs.notes,
        dataViewId: DEFAULT_DATA_VIEW_ID,
        deletedEventIds: [],
        documentType: '',
        queryFields: [],
        selectAll: false,
        id: 'test',
        savedObjectId: null,
        columns: defaultHeaders,
        defaultColumns: defaultHeaders,
        indexNames: DEFAULT_INDEX_PATTERN,
        itemsPerPage: 5,
        dataProviders: [],
        description: '',
        eqlOptions: {
          eventCategoryField: 'event.category',
          tiebreakerField: '',
          timestampField: '@timestamp',
        },
        eventIdToNoteIds: {},
        excludedRowRendererIds: [],
        expandedDetail: {},
        highlightedDropAndProviderId: '',
        historyIds: [],
        isFavorite: false,
        isLive: false,
        isSelectAllChecked: false,
        isLoading: false,
        kqlMode: 'filter',
        kqlQuery: { filterQuery: null },
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
        sessionViewId: null,
        show: false,
        showCheckboxes: false,
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        itemsPerPageOptions: [5, 10, 20],
        sort: [{ columnId: '@timestamp', columnType: 'number', sortDirection: Direction.desc }],
        isSaving: false,
        version: null,
        status: TimelineStatus.active,
      },
    },
    insertTimeline: null,
  },
  sourcerer: {
    ...mockSourcererState,
    defaultDataView: {
      ...mockSourcererState.defaultDataView,
      title: `${mockSourcererState.defaultDataView.title},fakebeat-*`,
    },
    kibanaDataViews: [
      {
        ...mockSourcererState.defaultDataView,
        title: `${mockSourcererState.defaultDataView.title},fakebeat-*`,
      },
    ],
    sourcererScopes: {
      ...mockSourcererState.sourcererScopes,
      [SourcererScopeName.default]: {
        ...mockSourcererState.sourcererScopes[SourcererScopeName.default],
        selectedDataViewId: mockSourcererState.defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          mockSourcererState.defaultDataView,
          SourcererScopeName.default,
          mockSourcererState.signalIndexName,
          true
        ),
      },
      [SourcererScopeName.detections]: {
        ...mockSourcererState.sourcererScopes[SourcererScopeName.detections],
        selectedDataViewId: mockSourcererState.defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          mockSourcererState.defaultDataView,
          SourcererScopeName.detections,
          mockSourcererState.signalIndexName,
          true
        ),
      },
      [SourcererScopeName.timeline]: {
        ...mockSourcererState.sourcererScopes[SourcererScopeName.timeline],
        selectedDataViewId: mockSourcererState.defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          mockSourcererState.defaultDataView,
          SourcererScopeName.timeline,
          mockSourcererState.signalIndexName,
          true
        ),
      },
    },
  },
  /**
   * These state's are wrapped in `Immutable`, but for compatibility with the overall app architecture,
   * they are cast to mutable versions here.
   */
  management: mockManagementState as ManagementState,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import type { DataViewSpec, FieldSpec } from '@kbn/data-views-plugin/public';
import { ReqStatus } from '../../notes/store/notes.slice';
import { HostsFields } from '../../../common/api/search_strategy/hosts/model/sort';
import { InputsModelId } from '../store/inputs/constants';
import {
  Direction,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopTablesFields,
  NetworkTlsFields,
  NetworkUsersFields,
  RiskScoreFields,
} from '../../../common/search_strategy';
import type { State } from '../store';

import { defaultHeaders } from './header';
import {
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_SIGNALS_INDEX,
  VIEW_SELECTION,
} from '../../../common/constants';
import { networkModel } from '../../explore/network/store';
import { TimelineTabs, TimelineId } from '../../../common/types/timeline';
import { TimelineType, TimelineStatus } from '../../../common/api/timeline';
import { mockManagementState } from '../../management/store/reducer';
import type { ManagementState } from '../../management/types';
import { initialSourcererState, SourcererScopeName } from '../../sourcerer/store/model';
import { allowedExperimentalValues } from '../../../common/experimental_features';
import { getScopePatternListSelection } from '../../sourcerer/store/helpers';
import { mockBrowserFields, mockIndexFields, mockRuntimeMappings } from '../containers/source/mock';
import { usersModel } from '../../explore/users/store';
import { UsersFields } from '../../../common/search_strategy/security_solution/users/common';
import { initialGroupingState } from '../store/grouping/reducer';
import type { SourcererState } from '../../sourcerer/store';
import { EMPTY_RESOLVER } from '../../resolver/store/helpers';
import { getMockDiscoverInTimelineState } from './mock_discover_state';
import { initialState as dataViewPickerInitialState } from '../../sourcerer/experimental/redux/reducer';

const mockFieldMap: DataViewSpec['fields'] = Object.fromEntries(
  mockIndexFields.map((field) => [field.name, field])
);

export const mockSourcererState: SourcererState = {
  ...initialSourcererState,
  signalIndexName: `${DEFAULT_SIGNALS_INDEX}-spacename`,
  defaultDataView: {
    ...initialSourcererState.defaultDataView,
    browserFields: mockBrowserFields,
    id: DEFAULT_DATA_VIEW_ID,
    indexFields: mockIndexFields as FieldSpec[],
    fields: mockFieldMap,
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
        anomalies: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        hostRisk: {
          activePage: 0,
          limit: 10,
          sort: { field: RiskScoreFields.hostRiskScore, direction: Direction.desc },
          severitySelection: [],
        },
        sessions: { activePage: 0, limit: 10 },
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
        anomalies: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        hostRisk: {
          activePage: 0,
          limit: 10,
          sort: { field: RiskScoreFields.hostRiskScore, direction: Direction.desc },
          severitySelection: [],
        },
        sessions: { activePage: 0, limit: 10 },
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
        [networkModel.NetworkTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
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
        [networkModel.NetworkTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
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
          sort: { field: UsersFields.name, direction: Direction.asc },
        },
        [usersModel.UsersTableType.authentications]: {
          activePage: 0,
          limit: 10,
        },
        [usersModel.UsersTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
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
      },
    },
    details: {
      queries: {
        [usersModel.UsersTableType.anomalies]: {
          jobIdSelection: [],
          intervalSelection: 'auto',
        },
        [usersModel.UsersTableType.events]: { activePage: 0, limit: 10 },
      },
    },
    flyout: {
      queries: {
        [usersModel.UserAssetTableType.assetEntra]: {
          fields: [],
        },
        [usersModel.UserAssetTableType.assetOkta]: {
          fields: [],
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
      linkTo: [InputsModelId.timeline, InputsModelId.socTrends],
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
      linkTo: [InputsModelId.global, InputsModelId.socTrends],
      queries: [],
      policy: { kind: DEFAULT_INTERVAL_TYPE, duration: DEFAULT_INTERVAL_VALUE },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
    },
    socTrends: {
      timerange: {
        kind: 'relative',
        fromStr: DEFAULT_FROM,
        toStr: DEFAULT_TO,
        from: '2020-07-06T08:20:18.966Z',
        to: '2020-07-07T08:20:18.966Z',
      },
      linkTo: [InputsModelId.global, InputsModelId.timeline],
      policy: { kind: DEFAULT_INTERVAL_TYPE, duration: DEFAULT_INTERVAL_VALUE },
    },
  },
  dragAndDrop: { dataProviders: {} },
  timeline: {
    showCallOutUnauthorizedMsg: false,
    timelineById: {
      [TimelineId.test]: {
        activeTab: TimelineTabs.query,
        prevActiveTab: TimelineTabs.notes,
        dataViewId: DEFAULT_DATA_VIEW_ID,
        deletedEventIds: [],
        documentType: '',
        queryFields: [],
        id: TimelineId.test,
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
        resolveTimelineConfig: undefined,
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        selectAll: false,
        sessionViewConfig: null,
        show: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: 'desc',
          },
        ],
        status: TimelineStatus.draft,
        version: null,
        selectedEventIds: {},
        isSelectAllChecked: false,
        filters: [],
        isSaving: false,
        itemsPerPageOptions: [10, 25, 50, 100],
        savedSearchId: null,
        savedSearch: null,
        isDataProviderVisible: true,
        sampleSize: 500,
      },
    },
    insertTimeline: null,
  },
  dataTable: {
    tableById: {
      [TableId.test]: {
        columns: defaultHeaders,
        defaultColumns: defaultHeaders,
        dataViewId: 'security-solution-default',
        deletedEventIds: [],
        expandedDetail: {},
        filters: [],
        indexNames: ['.alerts-security.alerts-default'],
        isSelectAllChecked: false,
        itemsPerPage: 25,
        itemsPerPageOptions: [10, 25, 50, 100],
        loadingEventIds: [],
        selectedEventIds: {},
        showCheckboxes: false,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: 'desc',
          },
        ],
        graphEventId: '',
        sessionViewConfig: null,
        selectAll: false,
        id: TableId.test,
        title: '',
        initialized: true,
        updated: 1663882629000,
        isLoading: false,
        queryFields: [],
        totalCount: 0,
        viewMode: VIEW_SELECTION.gridView,
        additionalFilters: {
          showBuildingBlockAlerts: false,
          showOnlyThreatIndicatorAlerts: false,
        },
      },
    },
  },
  groups: initialGroupingState,
  analyzer: {
    [TableId.test]: EMPTY_RESOLVER,
    [TimelineId.test]: EMPTY_RESOLVER,
    [TimelineId.active]: EMPTY_RESOLVER,
    flyout: EMPTY_RESOLVER,
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
      [SourcererScopeName.analyzer]: {
        ...mockSourcererState.sourcererScopes[SourcererScopeName.default],
        selectedDataViewId: mockSourcererState.defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          mockSourcererState.defaultDataView,
          SourcererScopeName.default,
          mockSourcererState.signalIndexName,
          true
        ),
      },
    },
  },
  globalUrlParam: {},
  /**
   * These state's are wrapped in `Immutable`, but for compatibility with the overall app architecture,
   * they are cast to mutable versions here.
   */
  management: mockManagementState as ManagementState,
  discover: getMockDiscoverInTimelineState(),
  dataViewPicker: dataViewPickerInitialState,
  notes: {
    ids: ['1'],
    entities: {
      '1': {
        eventId: 'event-id',
        noteId: '1',
        note: 'note-1',
        timelineId: 'timeline-1',
        created: 1663882629000,
        createdBy: 'elastic',
        updated: 1663882629000,
        updatedBy: 'elastic',
        version: 'version',
      },
    },
    status: {
      fetchNotesByDocumentId: ReqStatus.Idle,
    },
    error: {
      fetchNotesByDocumentId: null,
    },
  },
};

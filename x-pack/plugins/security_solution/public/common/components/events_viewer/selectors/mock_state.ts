/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { pipe } from 'lodash/fp';

import { mockGlobalState } from '../../../mock';

const filters = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'kibana.alert.severity',
      params: { query: 'low' },
    },
    $state: { store: 'appState' },
    query: { match_phrase: { 'kibana.alert.severity': { query: 'low' } } },
  },
];

const input = {
  timerange: {
    kind: 'relative',
    fromStr: 'now/d',
    toStr: 'now/d',
    from: '2022-03-17T06:00:00.000Z',
    to: '2022-03-18T05:59:59.999Z',
  },
  queries: [
    {
      id: 'timeline-1-eql',
      inspect: { dsl: [], response: [] },
      isInspected: false,
      loading: false,
      selectedInspectIndex: 0,
    },
  ],
  policy: { kind: 'manual', duration: 300000 },
  linkTo: ['global'],
  query: { query: '', language: 'kuery' },
  filters: [],
  fullScreen: false,
};

const query = { query: 'host.ip: *', language: 'kuery' };

const globalQueries = [
  {
    id: 'detections-page',
    inspect: {
      dsl: ['{\n  "allow_no_indices": ...}'],
    },
    isInspected: false,
    loading: false,
    selectedInspectIndex: 0,
  },
  {
    id: 'detections-alerts-count-3e92347c-7e0c-44dc-a13d-fbe71706a0f0',
    inspect: {
      dsl: ['{\n  "index": [\n ...}'],
      response: ['{\n  "took": 3,\n  ...}'],
    },
    isInspected: false,
    loading: false,
    selectedInspectIndex: 0,
  },
  {
    id: 'detections-histogram-a9c910ff-bcc9-48f2-9224-fad55cd5fd31',
    inspect: {
      dsl: ['{\n  "index": [\n ...}'],
      response: ['{\n  "took": 4,\n ...}'],
    },
    isInspected: false,
    loading: false,
    selectedInspectIndex: 0,
  },
];

const timelineQueries = [
  {
    id: 'detections-page',
    inspect: {
      dsl: ['{\n  "allow_no_indices": ...}'],
    },
    isInspected: false,
    loading: false,
    selectedInspectIndex: 0,
  },
];

const timeline = {
  id: 'detections-page',
  columns: [
    { columnHeaderType: 'not-filtered', id: '@timestamp', initialWidth: 200 },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Rule',
      id: 'kibana.alert.rule.name',
      initialWidth: 180,
      linkField: 'kibana.alert.rule.uuid',
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Severity',
      id: 'kibana.alert.severity',
      initialWidth: 105,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Risk Score',
      id: 'kibana.alert.risk_score',
      initialWidth: 100,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Reason',
      id: 'kibana.alert.reason',
      initialWidth: 450,
    },
    { columnHeaderType: 'not-filtered', id: 'host.name' },
    { columnHeaderType: 'not-filtered', id: 'user.name' },
    { columnHeaderType: 'not-filtered', id: 'process.name' },
    { columnHeaderType: 'not-filtered', id: 'file.name' },
    { columnHeaderType: 'not-filtered', id: 'source.ip' },
    { columnHeaderType: 'not-filtered', id: 'destination.ip' },
  ],
  defaultColumns: [
    { columnHeaderType: 'not-filtered', id: '@timestamp', initialWidth: 200 },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Rule',
      id: 'kibana.alert.rule.name',
      initialWidth: 180,
      linkField: 'kibana.alert.rule.uuid',
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Severity',
      id: 'kibana.alert.severity',
      initialWidth: 105,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Risk Score',
      id: 'kibana.alert.risk_score',
      initialWidth: 100,
    },
    {
      columnHeaderType: 'not-filtered',
      displayAsText: 'Reason',
      id: 'kibana.alert.reason',
      initialWidth: 450,
    },
    { columnHeaderType: 'not-filtered', id: 'host.name' },
    { columnHeaderType: 'not-filtered', id: 'user.name' },
    { columnHeaderType: 'not-filtered', id: 'process.name' },
    { columnHeaderType: 'not-filtered', id: 'file.name' },
    { columnHeaderType: 'not-filtered', id: 'source.ip' },
    { columnHeaderType: 'not-filtered', id: 'destination.ip' },
  ],
  dataViewId: 'security-solution-default',
  dateRange: { start: '2022-03-17T06:00:00.000Z', end: '2022-03-18T05:59:59.999Z' },
  deletedEventIds: [],
  excludedRowRendererIds: [
    'alerts',
    'auditd',
    'auditd_file',
    'library',
    'netflow',
    'plain',
    'registry',
    'suricata',
    'system',
    'system_dns',
    'system_endgame_process',
    'system_file',
    'system_fim',
    'system_security_event',
    'system_socket',
    'threat_match',
    'zeek',
  ],
  expandedDetail: {},
  filters: [],
  kqlQuery: { filterQuery: null },
  indexNames: ['.alerts-security.alerts-default'],
  isSelectAllChecked: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  loadingEventIds: [],
  selectedEventIds: {},
  showCheckboxes: true,
  sort: [{ columnId: '@timestamp', columnType: 'date', sortDirection: 'desc' }],
  savedObjectId: null,
  version: null,
  footerText: 'alerts',
  title: '',
  initialized: true,
  activeTab: 'query',
  prevActiveTab: 'query',
  dataProviders: [],
  description: '',
  eqlOptions: {
    eventCategoryField: 'event.category',
    tiebreakerField: '',
    timestampField: '@timestamp',
    query: '',
    size: 100,
  },
  eventType: 'all',
  eventIdToNoteIds: {},
  highlightedDropAndProviderId: '',
  historyIds: [],
  isFavorite: false,
  isLive: false,
  isSaving: false,
  kqlMode: 'filter',
  timelineType: 'default',
  templateTimelineId: null,
  templateTimelineVersion: null,
  noteIds: [],
  pinnedEventIds: {},
  pinnedEventsSaveObject: {},
  show: false,
  status: 'draft',
  updated: 1647542283361,
  documentType: '',
  isLoading: false,
  queryFields: [],
  selectAll: false,
};

export const mockState = pipe(
  (state) => set(state, 'inputs.global.filters', filters),
  (state) => set(state, 'inputs.timeline', input),
  (state) => set(state, 'inputs.global.query', query),
  (state) => set(state, 'inputs.global.queries', globalQueries),
  (state) => set(state, 'inputs.timeline.queries', timelineQueries),
  (state) => set(state, 'timeline.timelineById.detections-page', timeline)
)(mockGlobalState);

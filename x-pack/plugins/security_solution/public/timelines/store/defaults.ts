/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineTabs } from '../../../common/types/timeline';
import {
  TimelineTypeEnum,
  TimelineStatusEnum,
  RowRendererIdEnum,
} from '../../../common/api/timeline';

import { defaultHeaders } from '../components/timeline/body/column_headers/default_headers';
import { normalizeTimeRange } from '../../common/utils/normalize_time_range';
import type { SubsetTimelineModel, TimelineModel } from './model';
import { defaultUdtHeaders } from '../components/timeline/unified_components/default_headers';

// normalizeTimeRange uses getTimeRangeSettings which cannot be used outside Kibana context if the uiSettings is not false
const { from: start, to: end } = normalizeTimeRange({ from: '', to: '' }, false);

export const timelineDefaults: SubsetTimelineModel &
  Pick<TimelineModel, 'eqlOptions' | 'resolveTimelineConfig' | 'sampleSize' | 'rowHeight'> = {
  activeTab: TimelineTabs.query,
  prevActiveTab: TimelineTabs.query,
  columns: defaultUdtHeaders,
  documentType: '',
  defaultColumns: defaultUdtHeaders,
  dataProviders: [],
  dataViewId: null,
  dateRange: { start, end },
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
  excludedRowRendererIds: [
    RowRendererIdEnum.alert,
    RowRendererIdEnum.alerts,
    RowRendererIdEnum.auditd,
    RowRendererIdEnum.auditd_file,
    RowRendererIdEnum.library,
    RowRendererIdEnum.netflow,
    RowRendererIdEnum.plain,
    RowRendererIdEnum.registry,
    RowRendererIdEnum.suricata,
    RowRendererIdEnum.system,
    RowRendererIdEnum.system_dns,
    RowRendererIdEnum.system_endgame_process,
    RowRendererIdEnum.system_file,
    RowRendererIdEnum.system_fim,
    RowRendererIdEnum.system_security_event,
    RowRendererIdEnum.system_socket,
    RowRendererIdEnum.threat_match,
    RowRendererIdEnum.zeek,
  ],
  highlightedDropAndProviderId: '',
  historyIds: [],
  indexNames: [],
  isFavorite: false,
  isLive: false,
  isLoading: false,
  isSaving: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: null,
  },
  loadingEventIds: [],
  resolveTimelineConfig: undefined,
  queryFields: [],
  title: '',
  timelineType: TimelineTypeEnum.default,
  templateTimelineId: null,
  templateTimelineVersion: null,
  noteIds: [],
  pinnedEventIds: {},
  pinnedEventsSaveObject: {},
  savedObjectId: null,
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
  status: TimelineStatusEnum.draft,
  version: null,
  deletedEventIds: [],
  selectedEventIds: {},
  isSelectAllChecked: false,
  filters: [],
  savedSearchId: null,
  savedSearch: null,
  isDataProviderVisible: false,
  sampleSize: 500,
  rowHeight: 3,
};

export const getTimelineManageDefaults = (id: string) => ({
  defaultColumns: defaultHeaders,
  documentType: '',
  selectAll: false,
  id,
  isLoading: false,
  queryFields: [],
  title: '',
  graphEventId: '',
});

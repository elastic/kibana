/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set/fp';
import { getOr, isEmpty } from 'lodash/fp';
import { Action } from 'typescript-fsa';
import uuid from 'uuid';
import { Dispatch } from 'redux';
import deepMerge from 'deepmerge';

import {
  ColumnHeaderOptions,
  DataProviderType,
  TimelineId,
  TimelineStatus,
  TimelineType,
  TimelineTabs,
  TimelineResult,
  SingleTimelineResolveResponse,
  ColumnHeaderResult,
  FilterTimelineResult,
  DataProviderResult,
} from '../../../../common/types/timeline';

import {
  addNotes as dispatchAddNotes,
  updateNote as dispatchUpdateNote,
} from '../../../common/store/app/actions';
import {
  setTimelineRangeDatePicker as dispatchSetTimelineRangeDatePicker,
  setRelativeRangeDatePicker as dispatchSetRelativeRangeDatePicker,
} from '../../../common/store/inputs/actions';
import {
  applyKqlFilterQuery as dispatchApplyKqlFilterQuery,
  addTimeline as dispatchAddTimeline,
  addNote as dispatchAddGlobalTimelineNote,
} from '../../store/timeline/actions';
import { TimelineModel } from '../../store/timeline/model';
import { timelineDefaults } from '../../store/timeline/defaults';

import {
  defaultColumnHeaderType,
  defaultHeaders,
} from '../timeline/body/column_headers/default_headers';
import {
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  DEFAULT_COLUMN_MIN_WIDTH,
} from '../timeline/body/constants';

import {
  OpenTimelineResult,
  UpdateTimeline,
  DispatchUpdateTimeline,
  TimelineErrorCallback,
} from './types';
import { createNote } from '../notes/helpers';
import { IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { normalizeTimeRange } from '../../../common/components/url_state/normalize_time_range';
import { sourcererActions } from '../../../common/store/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import {
  DEFAULT_FROM_MOMENT,
  DEFAULT_TO_MOMENT,
} from '../../../common/utils/default_date_settings';
import { resolveTimeline } from '../../containers/api';
import { PinnedEvent } from '../../../../common/types/timeline/pinned_event';
import { NoteResult } from '../../../../common/types/timeline/note';

export const OPEN_TIMELINE_CLASS_NAME = 'open-timeline';

/** Returns a count of the pinned events in a timeline */
export const getPinnedEventCount = ({ pinnedEventIds }: OpenTimelineResult): number =>
  pinnedEventIds != null ? Object.keys(pinnedEventIds).length : 0;

/** Returns the sum of all notes added to pinned events and notes applicable to the timeline */
export const getNotesCount = ({ eventIdToNoteIds, noteIds }: OpenTimelineResult): number => {
  const eventNoteCount =
    eventIdToNoteIds != null
      ? Object.keys(eventIdToNoteIds).reduce<number>(
          (count, eventId) => count + eventIdToNoteIds[eventId].length,
          0
        )
      : 0;

  const globalNoteCount = noteIds != null ? noteIds.length : 0;

  return eventNoteCount + globalNoteCount;
};

/** Returns true if the timeline is untitlied */
export const isUntitled = ({ title }: OpenTimelineResult): boolean =>
  title == null || title.trim().length === 0;

const omitTypename = (key: string, value: keyof TimelineModel) =>
  key === '__typename' ? undefined : value;

export const omitTypenameInTimeline = (timeline: TimelineResult): TimelineResult =>
  JSON.parse(JSON.stringify(timeline), omitTypename);

const parseString = (params: string) => {
  try {
    return JSON.parse(params);
  } catch {
    return params;
  }
};

const setTimelineColumn = (col: ColumnHeaderResult) =>
  Object.entries(col).reduce<ColumnHeaderOptions>(
    (acc, [key, value]) => {
      if (key !== 'id' && value != null) {
        return { ...acc, [key]: value };
      }
      return acc;
    },
    {
      columnHeaderType: defaultColumnHeaderType,
      id: col.id != null ? col.id : 'unknown',
      initialWidth:
        col.id === '@timestamp' ? DEFAULT_DATE_COLUMN_MIN_WIDTH : DEFAULT_COLUMN_MIN_WIDTH,
    }
  );

const setTimelineFilters = (filter: FilterTimelineResult) => ({
  $state: {
    store: 'appState',
  },
  meta: {
    ...filter.meta,
    ...(filter.meta && filter.meta.field != null ? { params: parseString(filter.meta.field) } : {}),
    ...(filter.meta && filter.meta.params != null
      ? { params: parseString(filter.meta.params) }
      : {}),
    ...(filter.meta && filter.meta.value != null ? { value: parseString(filter.meta.value) } : {}),
  },
  ...(filter.exists != null ? { exists: parseString(filter.exists) } : {}),
  ...(filter.match_all != null ? { exists: parseString(filter.match_all) } : {}),
  ...(filter.missing != null ? { exists: parseString(filter.missing) } : {}),
  ...(filter.query != null ? { query: parseString(filter.query) } : {}),
  ...(filter.range != null ? { range: parseString(filter.range) } : {}),
  ...(filter.script != null ? { exists: parseString(filter.script) } : {}),
});

const setEventIdToNoteIds = (
  duplicate: boolean,
  eventIdToNoteIds: NoteResult[] | null | undefined
) =>
  duplicate
    ? {}
    : eventIdToNoteIds != null
    ? eventIdToNoteIds.reduce((acc, note) => {
        if (note.eventId != null) {
          const eventNotes = getOr([], note.eventId, acc);
          return { ...acc, [note.eventId]: [...eventNotes, note.noteId] };
        }
        return acc;
      }, {})
    : {};

const setPinnedEventsSaveObject = (
  duplicate: boolean,
  pinnedEventsSaveObject: PinnedEvent[] | null | undefined
) =>
  duplicate
    ? {}
    : pinnedEventsSaveObject != null
    ? pinnedEventsSaveObject.reduce(
        (acc, pinnedEvent) => ({
          ...acc,
          ...(pinnedEvent.eventId != null ? { [pinnedEvent.eventId]: pinnedEvent } : {}),
        }),
        {}
      )
    : {};

const setPinnedEventIds = (duplicate: boolean, pinnedEventIds: string[] | null | undefined) =>
  duplicate
    ? {}
    : pinnedEventIds != null
    ? pinnedEventIds.reduce((acc, pinnedEventId) => ({ ...acc, [pinnedEventId]: true }), {})
    : {};

const getTemplateTimelineId = (
  timeline: TimelineResult,
  duplicate: boolean,
  targetTimelineType?: TimelineType
) => {
  if (
    targetTimelineType === TimelineType.default &&
    timeline.timelineType === TimelineType.template
  ) {
    return timeline.templateTimelineId;
  }

  return duplicate && timeline.timelineType === TimelineType.template
    ? // TODO: MOVE TO THE BACKEND
      uuid.v4()
    : timeline.templateTimelineId;
};

const convertToDefaultField = ({ and, ...dataProvider }: DataProviderResult) => {
  if (dataProvider.type === DataProviderType.template) {
    return deepMerge(dataProvider, {
      type: DataProviderType.default,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      enabled: dataProvider.queryMatch!.operator !== IS_OPERATOR,
      queryMatch: {
        value:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          dataProvider.queryMatch!.operator === IS_OPERATOR ? '' : dataProvider.queryMatch!.value,
      },
    });
  }

  return dataProvider;
};

const getDataProviders = (
  duplicate: boolean,
  dataProviders: TimelineResult['dataProviders'],
  timelineType?: TimelineType
) => {
  if (duplicate && dataProviders && timelineType === TimelineType.default) {
    return dataProviders.map((dataProvider) => ({
      ...convertToDefaultField(dataProvider),
      and: dataProvider.and?.map(convertToDefaultField) ?? [],
    }));
  }

  return dataProviders;
};

export const getTimelineTitle = (
  timeline: TimelineResult,
  duplicate: boolean,
  timelineType?: TimelineType
) => {
  const isCreateTimelineFromAction = timelineType && timeline.timelineType !== timelineType;
  if (isCreateTimelineFromAction) return '';

  return duplicate ? `${timeline.title} - Duplicate` : timeline.title || '';
};

export const getTimelineStatus = (
  timeline: TimelineResult,
  duplicate: boolean,
  timelineType?: TimelineType
) => {
  const isCreateTimelineFromAction = timelineType && timeline.timelineType !== timelineType;
  if (isCreateTimelineFromAction) return TimelineStatus.draft;

  return duplicate ? TimelineStatus.active : timeline.status;
};

export const defaultTimelineToTimelineModel = (
  timeline: TimelineResult,
  duplicate: boolean,
  timelineType?: TimelineType
): TimelineModel => {
  const isTemplate = timeline.timelineType === TimelineType.template;
  const timelineEntries = {
    ...timeline,
    columns: timeline.columns != null ? timeline.columns.map(setTimelineColumn) : defaultHeaders,
    defaultColumns: defaultHeaders,
    dateRange:
      timeline.status === TimelineStatus.immutable &&
      timeline.timelineType === TimelineType.template
        ? {
            start: DEFAULT_FROM_MOMENT.toISOString(),
            end: DEFAULT_TO_MOMENT.toISOString(),
          }
        : timeline.dateRange,
    dataProviders: getDataProviders(duplicate, timeline.dataProviders, timelineType),
    eventIdToNoteIds: setEventIdToNoteIds(duplicate, timeline.eventIdToNoteIds),
    filters: timeline.filters != null ? timeline.filters.map(setTimelineFilters) : [],
    isFavorite: duplicate
      ? false
      : timeline.favorite != null
      ? timeline.favorite.length > 0
      : false,
    noteIds: duplicate ? [] : timeline.noteIds != null ? timeline.noteIds : [],
    pinnedEventIds: setPinnedEventIds(duplicate, timeline.pinnedEventIds),
    pinnedEventsSaveObject: setPinnedEventsSaveObject(duplicate, timeline.pinnedEventsSaveObject),
    id: duplicate ? '' : timeline.savedObjectId,
    status: getTimelineStatus(timeline, duplicate, timelineType),
    savedObjectId: duplicate ? null : timeline.savedObjectId,
    version: duplicate ? null : timeline.version,
    timelineType: timelineType ?? timeline.timelineType,
    title: getTimelineTitle(timeline, duplicate, timelineType),
    templateTimelineId: getTemplateTimelineId(timeline, duplicate, timelineType),
    templateTimelineVersion: duplicate && isTemplate ? 1 : timeline.templateTimelineVersion,
  };
  return Object.entries(timelineEntries).reduce(
    (acc: TimelineModel, [key, value]) => (value != null ? set(key, value, acc) : acc),
    {
      ...timelineDefaults,
      id: '',
    }
  );
};

export const formatTimelineResultToModel = (
  timelineToOpen: TimelineResult,
  duplicate: boolean = false,
  timelineType?: TimelineType
): { notes: NoteResult[] | null | undefined; timeline: TimelineModel } => {
  const { notes, ...timelineModel } = timelineToOpen;
  return {
    notes,
    timeline: defaultTimelineToTimelineModel(timelineModel, duplicate, timelineType),
  };
};

export interface QueryTimelineById<TCache> {
  activeTimelineTab?: TimelineTabs;
  duplicate?: boolean;
  graphEventId?: string;
  timelineId: string;
  timelineType?: TimelineType;
  onError?: TimelineErrorCallback;
  onOpenTimeline?: (timeline: TimelineModel) => void;
  openTimeline?: boolean;
  updateIsLoading: ({
    id,
    isLoading,
  }: {
    id: string;
    isLoading: boolean;
  }) => Action<{ id: string; isLoading: boolean }>;
  updateTimeline: DispatchUpdateTimeline;
}

export const queryTimelineById = <TCache>({
  activeTimelineTab = TimelineTabs.query,
  duplicate = false,
  graphEventId = '',
  timelineId,
  timelineType,
  onError,
  onOpenTimeline,
  openTimeline = true,
  updateIsLoading,
  updateTimeline,
}: QueryTimelineById<TCache>) => {
  updateIsLoading({ id: TimelineId.active, isLoading: true });
  Promise.resolve(resolveTimeline(timelineId))
    .then((result) => {
      const data: SingleTimelineResolveResponse['data'] | null = getOr(null, 'data', result);
      if (!data) return;

      const timelineToOpen = omitTypenameInTimeline(data.timeline);

      const { timeline, notes } = formatTimelineResultToModel(
        timelineToOpen,
        duplicate,
        timelineType
      );

      if (onOpenTimeline != null) {
        onOpenTimeline(timeline);
      } else if (updateTimeline) {
        const { from, to } = normalizeTimeRange({
          from: getOr(null, 'dateRange.start', timeline),
          to: getOr(null, 'dateRange.end', timeline),
        });
        updateTimeline({
          duplicate,
          from,
          id: TimelineId.active,
          notes,
          resolveTimelineConfig: {
            outcome: data.outcome,
            alias_target_id: data.alias_target_id,
            alias_purpose: data.alias_purpose,
          },
          timeline: {
            ...timeline,
            activeTab: activeTimelineTab,
            graphEventId,
            show: openTimeline,
            dateRange: { start: from, end: to },
          },
          to,
        })();
      }
    })
    .catch((error) => {
      if (onError != null) {
        onError(error, timelineId);
      }
    })
    .finally(() => {
      updateIsLoading({ id: TimelineId.active, isLoading: false });
    });
};

export const dispatchUpdateTimeline =
  (dispatch: Dispatch): DispatchUpdateTimeline =>
  ({
    duplicate,
    id,
    forceNotes = false,
    from,
    notes,
    resolveTimelineConfig,
    timeline,
    to,
    ruleNote,
  }: UpdateTimeline): (() => void) =>
  () => {
    if (!isEmpty(timeline.indexNames)) {
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: timeline.dataViewId,
          selectedPatterns: timeline.indexNames,
        })
      );
    }
    if (
      timeline.status === TimelineStatus.immutable &&
      timeline.timelineType === TimelineType.template
    ) {
      dispatch(
        dispatchSetRelativeRangeDatePicker({
          id: 'timeline',
          fromStr: 'now-24h',
          toStr: 'now',
          from: DEFAULT_FROM_MOMENT.toISOString(),
          to: DEFAULT_TO_MOMENT.toISOString(),
        })
      );
    } else {
      dispatch(dispatchSetTimelineRangeDatePicker({ from, to }));
    }
    dispatch(
      dispatchAddTimeline({ id, timeline, resolveTimelineConfig, savedTimeline: duplicate })
    );
    if (
      timeline.kqlQuery != null &&
      timeline.kqlQuery.filterQuery != null &&
      timeline.kqlQuery.filterQuery.kuery != null &&
      timeline.kqlQuery.filterQuery.kuery.expression !== ''
    ) {
      dispatch(
        dispatchApplyKqlFilterQuery({
          id,
          filterQuery: {
            kuery: {
              kind: timeline.kqlQuery.filterQuery.kuery.kind ?? 'kuery',
              expression: timeline.kqlQuery.filterQuery.kuery.expression || '',
            },
            serializedQuery: timeline.kqlQuery.filterQuery.serializedQuery || '',
          },
        })
      );
    }

    if (duplicate && ruleNote != null && !isEmpty(ruleNote)) {
      const newNote = createNote({ newNote: ruleNote });
      dispatch(dispatchUpdateNote({ note: newNote }));
      dispatch(dispatchAddGlobalTimelineNote({ noteId: newNote.id, id }));
    }

    if (!duplicate || forceNotes) {
      dispatch(
        dispatchAddNotes({
          notes:
            notes != null
              ? notes.map((note: NoteResult) => ({
                  created: note.created != null ? new Date(note.created) : new Date(),
                  id: note.noteId,
                  lastEdit: note.updated != null ? new Date(note.updated) : new Date(),
                  note: note.note || '',
                  user: note.updatedBy || 'unknown',
                  saveObjectId: note.noteId,
                  version: note.version,
                  eventId: note.eventId ?? null,
                  timelineId: note.timelineId ?? null,
                }))
              : [],
        })
      );
    }
  };

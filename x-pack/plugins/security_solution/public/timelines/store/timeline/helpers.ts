/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, omit, uniq, isEmpty, isEqualWith, union } from 'lodash/fp';

import uuid from 'uuid';
import { Filter } from '../../../../../../../src/plugins/data/public';

import { disableTemplate } from '../../../../common/constants';

import { getColumnWidthFromType } from '../../../timelines/components/timeline/body/column_headers/helpers';
import { Sort } from '../../../timelines/components/timeline/body/sort';
import {
  DataProvider,
  QueryOperator,
  QueryMatch,
} from '../../../timelines/components/timeline/data_providers/data_provider';
import { KueryFilterQuery, SerializedFilterQuery } from '../../../common/store/model';
import { TimelineNonEcsData } from '../../../graphql/types';
import { TimelineTypeLiteral, TimelineType } from '../../../../common/types/timeline';

import { timelineDefaults } from './defaults';
import { ColumnHeaderOptions, KqlMode, TimelineModel, EventType } from './model';
import { TimelineById } from './types';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

interface AddTimelineHistoryParams {
  id: string;
  historyId: string;
  timelineById: TimelineById;
}

export const addTimelineHistory = ({
  id,
  historyId,
  timelineById,
}: AddTimelineHistoryParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      historyIds: uniq([...timeline.historyIds, historyId]),
    },
  };
};

interface AddTimelineNoteParams {
  id: string;
  noteId: string;
  timelineById: TimelineById;
}

export const addTimelineNote = ({
  id,
  noteId,
  timelineById,
}: AddTimelineNoteParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      noteIds: [...timeline.noteIds, noteId],
    },
  };
};

interface AddTimelineNoteToEventParams {
  id: string;
  noteId: string;
  eventId: string;
  timelineById: TimelineById;
}

export const addTimelineNoteToEvent = ({
  id,
  noteId,
  eventId,
  timelineById,
}: AddTimelineNoteToEventParams): TimelineById => {
  const timeline = timelineById[id];
  const existingNoteIds = getOr([], `eventIdToNoteIds.${eventId}`, timeline);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      eventIdToNoteIds: {
        ...timeline.eventIdToNoteIds,
        ...{ [eventId]: uniq([...existingNoteIds, noteId]) },
      },
    },
  };
};

interface AddTimelineParams {
  id: string;
  timeline: TimelineModel;
  timelineById: TimelineById;
}

/**
 * Add a saved object timeline to the store
 * and default the value to what need to be if values are null
 */
export const addTimelineToStore = ({
  id,
  timeline,
  timelineById,
}: AddTimelineParams): TimelineById => ({
  ...timelineById,
  [id]: {
    ...timeline,
    isLoading: timelineById[id].isLoading,
  },
});

interface AddNewTimelineParams {
  columns: ColumnHeaderOptions[];
  dataProviders?: DataProvider[];
  dateRange?: {
    start: number;
    end: number;
  };
  filters?: Filter[];
  id: string;
  itemsPerPage?: number;
  kqlQuery?: {
    filterQuery: SerializedFilterQuery | null;
    filterQueryDraft: KueryFilterQuery | null;
  };
  show?: boolean;
  sort?: Sort;
  showCheckboxes?: boolean;
  showRowRenderers?: boolean;
  timelineById: TimelineById;
  timelineType: TimelineTypeLiteral;
}

/** Adds a new `Timeline` to the provided collection of `TimelineById` */
export const addNewTimeline = ({
  columns,
  dataProviders = [],
  dateRange = { start: 0, end: 0 },
  filters = timelineDefaults.filters,
  id,
  itemsPerPage = timelineDefaults.itemsPerPage,
  kqlQuery = { filterQuery: null, filterQueryDraft: null },
  sort = timelineDefaults.sort,
  show = false,
  showCheckboxes = false,
  showRowRenderers = true,
  timelineById,
  timelineType,
}: AddNewTimelineParams): TimelineById => {
  const templateTimelineInfo =
    !disableTemplate && timelineType === TimelineType.template
      ? {
          templateTimelineId: uuid.v4(),
          templateTimelineVersion: 1,
        }
      : {};
  return {
    ...timelineById,
    [id]: {
      id,
      ...timelineDefaults,
      columns,
      dataProviders,
      dateRange,
      filters,
      itemsPerPage,
      kqlQuery,
      sort,
      show,
      savedObjectId: null,
      version: null,
      isSaving: false,
      isLoading: false,
      showCheckboxes,
      showRowRenderers,
      timelineType: !disableTemplate ? timelineType : timelineDefaults.timelineType,
      ...templateTimelineInfo,
    },
  };
};

interface PinTimelineEventParams {
  id: string;
  eventId: string;
  timelineById: TimelineById;
}

export const pinTimelineEvent = ({
  id,
  eventId,
  timelineById,
}: PinTimelineEventParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      pinnedEventIds: {
        ...timeline.pinnedEventIds,
        ...{ [eventId]: true },
      },
    },
  };
};

interface UpdateShowTimelineProps {
  id: string;
  show: boolean;
  timelineById: TimelineById;
}

export const updateTimelineShowTimeline = ({
  id,
  show,
  timelineById,
}: UpdateShowTimelineProps): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      show,
    },
  };
};

export const updateGraphEventId = ({
  id,
  graphEventId,
  timelineById,
}: {
  id: string;
  graphEventId: string;
  timelineById: TimelineById;
}): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      graphEventId,
    },
  };
};

interface ApplyDeltaToCurrentWidthParams {
  id: string;
  delta: number;
  bodyClientWidthPixels: number;
  minWidthPixels: number;
  maxWidthPercent: number;
  timelineById: TimelineById;
}

export const applyDeltaToCurrentWidth = ({
  id,
  delta,
  bodyClientWidthPixels,
  minWidthPixels,
  maxWidthPercent,
  timelineById,
}: ApplyDeltaToCurrentWidthParams): TimelineById => {
  const timeline = timelineById[id];

  const requestedWidth = timeline.width + delta * -1; // raw change in width
  const maxWidthPixels = (maxWidthPercent / 100) * bodyClientWidthPixels;
  const clampedWidth = Math.min(requestedWidth, maxWidthPixels);
  const width = Math.max(minWidthPixels, clampedWidth); // if the clamped width is smaller than the min, use the min

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      width,
    },
  };
};

const queryMatchCustomizer = (dp1: QueryMatch, dp2: QueryMatch) => {
  if (dp1.field === dp2.field && dp1.value === dp2.value && dp1.operator === dp2.operator) {
    return true;
  }
  return false;
};

const addAndToProviderInTimeline = (
  id: string,
  provider: DataProvider,
  timeline: TimelineModel,
  timelineById: TimelineById
): TimelineById => {
  const alreadyExistsProviderIndex = timeline.dataProviders.findIndex(
    (p) => p.id === timeline.highlightedDropAndProviderId
  );
  const newProvider = timeline.dataProviders[alreadyExistsProviderIndex];
  const alreadyExistsAndProviderIndex = newProvider.and.findIndex((p) => p.id === provider.id);
  const { and, ...andProvider } = provider;

  if (
    isEqualWith(queryMatchCustomizer, newProvider.queryMatch, andProvider.queryMatch) ||
    (alreadyExistsAndProviderIndex === -1 &&
      newProvider.and.filter((itemAndProvider) =>
        isEqualWith(queryMatchCustomizer, itemAndProvider.queryMatch, andProvider.queryMatch)
      ).length > 0)
  ) {
    return timelineById;
  }

  const dataProviders = [
    ...timeline.dataProviders.slice(0, alreadyExistsProviderIndex),
    {
      ...timeline.dataProviders[alreadyExistsProviderIndex],
      and:
        alreadyExistsAndProviderIndex > -1
          ? [
              ...newProvider.and.slice(0, alreadyExistsAndProviderIndex),
              andProvider,
              ...newProvider.and.slice(alreadyExistsAndProviderIndex + 1),
            ]
          : [...newProvider.and, andProvider],
    },
    ...timeline.dataProviders.slice(alreadyExistsProviderIndex + 1),
  ];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders,
    },
  };
};

const addProviderToTimeline = (
  id: string,
  provider: DataProvider,
  timeline: TimelineModel,
  timelineById: TimelineById
): TimelineById => {
  const alreadyExistsAtIndex = timeline.dataProviders.findIndex((p) => p.id === provider.id);

  if (alreadyExistsAtIndex > -1 && !isEmpty(timeline.dataProviders[alreadyExistsAtIndex].and)) {
    provider.id = `${provider.id}-${
      timeline.dataProviders.filter((p) => p.id === provider.id).length
    }`;
  }

  const dataProviders =
    alreadyExistsAtIndex > -1 && isEmpty(timeline.dataProviders[alreadyExistsAtIndex].and)
      ? [
          ...timeline.dataProviders.slice(0, alreadyExistsAtIndex),
          provider,
          ...timeline.dataProviders.slice(alreadyExistsAtIndex + 1),
        ]
      : [...timeline.dataProviders, provider];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders,
    },
  };
};

interface AddTimelineColumnParams {
  column: ColumnHeaderOptions;
  id: string;
  index: number;
  timelineById: TimelineById;
}

/**
 * Adds or updates a column. When updating a column, it will be moved to the
 * new index
 */
export const upsertTimelineColumn = ({
  column,
  id,
  index,
  timelineById,
}: AddTimelineColumnParams): TimelineById => {
  const timeline = timelineById[id];
  const alreadyExistsAtIndex = timeline.columns.findIndex((c) => c.id === column.id);

  if (alreadyExistsAtIndex !== -1) {
    // remove the existing entry and add the new one at the specified index
    const reordered = timeline.columns.filter((c) => c.id !== column.id);
    reordered.splice(index, 0, column); // ⚠️ mutation

    return {
      ...timelineById,
      [id]: {
        ...timeline,
        columns: reordered,
      },
    };
  }

  // add the new entry at the specified index
  const columns = [...timeline.columns];
  columns.splice(index, 0, column); // ⚠️ mutation

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface RemoveTimelineColumnParams {
  id: string;
  columnId: string;
  timelineById: TimelineById;
}

export const removeTimelineColumn = ({
  id,
  columnId,
  timelineById,
}: RemoveTimelineColumnParams): TimelineById => {
  const timeline = timelineById[id];

  const columns = timeline.columns.filter((c) => c.id !== columnId);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface ApplyDeltaToTimelineColumnWidth {
  id: string;
  columnId: string;
  delta: number;
  timelineById: TimelineById;
}

export const applyDeltaToTimelineColumnWidth = ({
  id,
  columnId,
  delta,
  timelineById,
}: ApplyDeltaToTimelineColumnWidth): TimelineById => {
  const timeline = timelineById[id];

  const columnIndex = timeline.columns.findIndex((c) => c.id === columnId);
  if (columnIndex === -1) {
    // the column was not found
    return {
      ...timelineById,
      [id]: {
        ...timeline,
      },
    };
  }
  const minWidthPixels = getColumnWidthFromType(timeline.columns[columnIndex].type!);
  const requestedWidth = timeline.columns[columnIndex].width + delta; // raw change in width
  const width = Math.max(minWidthPixels, requestedWidth); // if the requested width is smaller than the min, use the min

  const columnWithNewWidth = {
    ...timeline.columns[columnIndex],
    width,
  };

  const columns = [
    ...timeline.columns.slice(0, columnIndex),
    columnWithNewWidth,
    ...timeline.columns.slice(columnIndex + 1),
  ];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface AddTimelineProviderParams {
  id: string;
  provider: DataProvider;
  timelineById: TimelineById;
}

export const addTimelineProvider = ({
  id,
  provider,
  timelineById,
}: AddTimelineProviderParams): TimelineById => {
  const timeline = timelineById[id];

  if (timeline.highlightedDropAndProviderId !== '') {
    return addAndToProviderInTimeline(id, provider, timeline, timelineById);
  } else {
    return addProviderToTimeline(id, provider, timeline, timelineById);
  }
};

interface ApplyKqlFilterQueryDraftParams {
  id: string;
  filterQuery: SerializedFilterQuery;
  timelineById: TimelineById;
}

export const applyKqlFilterQueryDraft = ({
  id,
  filterQuery,
  timelineById,
}: ApplyKqlFilterQueryDraftParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      kqlQuery: {
        ...timeline.kqlQuery,
        filterQuery,
      },
    },
  };
};

interface UpdateTimelineKqlModeParams {
  id: string;
  kqlMode: KqlMode;
  timelineById: TimelineById;
}

export const updateTimelineKqlMode = ({
  id,
  kqlMode,
  timelineById,
}: UpdateTimelineKqlModeParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      kqlMode,
    },
  };
};

interface UpdateKqlFilterQueryDraftParams {
  id: string;
  filterQueryDraft: KueryFilterQuery;
  timelineById: TimelineById;
}

export const updateKqlFilterQueryDraft = ({
  id,
  filterQueryDraft,
  timelineById,
}: UpdateKqlFilterQueryDraftParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      kqlQuery: {
        ...timeline.kqlQuery,
        filterQueryDraft,
      },
    },
  };
};

interface UpdateTimelineColumnsParams {
  id: string;
  columns: ColumnHeaderOptions[];
  timelineById: TimelineById;
}

export const updateTimelineColumns = ({
  id,
  columns,
  timelineById,
}: UpdateTimelineColumnsParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      columns,
    },
  };
};

interface UpdateTimelineDescriptionParams {
  id: string;
  description: string;
  timelineById: TimelineById;
}

export const updateTimelineDescription = ({
  id,
  description,
  timelineById,
}: UpdateTimelineDescriptionParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      description: description.endsWith(' ') ? `${description.trim()} ` : description.trim(),
    },
  };
};

interface UpdateTimelineTitleParams {
  id: string;
  title: string;
  timelineById: TimelineById;
}

export const updateTimelineTitle = ({
  id,
  title,
  timelineById,
}: UpdateTimelineTitleParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      title: title.endsWith(' ') ? `${title.trim()} ` : title.trim(),
    },
  };
};

interface UpdateTimelineEventTypeParams {
  id: string;
  eventType: EventType;
  timelineById: TimelineById;
}

export const updateTimelineEventType = ({
  id,
  eventType,
  timelineById,
}: UpdateTimelineEventTypeParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      eventType,
    },
  };
};

interface UpdateTimelineIsFavoriteParams {
  id: string;
  isFavorite: boolean;
  timelineById: TimelineById;
}

export const updateTimelineIsFavorite = ({
  id,
  isFavorite,
  timelineById,
}: UpdateTimelineIsFavoriteParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      isFavorite,
    },
  };
};

interface UpdateTimelineIsLiveParams {
  id: string;
  isLive: boolean;
  timelineById: TimelineById;
}

export const updateTimelineIsLive = ({
  id,
  isLive,
  timelineById,
}: UpdateTimelineIsLiveParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      isLive,
    },
  };
};

interface UpdateTimelineProvidersParams {
  id: string;
  providers: DataProvider[];
  timelineById: TimelineById;
}

export const updateTimelineProviders = ({
  id,
  providers,
  timelineById,
}: UpdateTimelineProvidersParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: providers,
    },
  };
};

interface UpdateTimelineRangeParams {
  id: string;
  start: number;
  end: number;
  timelineById: TimelineById;
}

export const updateTimelineRange = ({
  id,
  start,
  end,
  timelineById,
}: UpdateTimelineRangeParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dateRange: {
        start,
        end,
      },
    },
  };
};

interface UpdateTimelineSortParams {
  id: string;
  sort: Sort;
  timelineById: TimelineById;
}

export const updateTimelineSort = ({
  id,
  sort,
  timelineById,
}: UpdateTimelineSortParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      sort,
    },
  };
};

const updateEnabledAndProvider = (
  andProviderId: string,
  enabled: boolean,
  providerId: string,
  timeline: TimelineModel
) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId ? { ...andProvider, enabled } : andProvider
          ),
        }
      : provider
  );

const updateEnabledProvider = (enabled: boolean, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          enabled,
        }
      : provider
  );

interface UpdateTimelineProviderEnabledParams {
  id: string;
  providerId: string;
  enabled: boolean;
  timelineById: TimelineById;
  andProviderId?: string;
}

export const updateTimelineProviderEnabled = ({
  id,
  providerId,
  enabled,
  timelineById,
  andProviderId,
}: UpdateTimelineProviderEnabledParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateEnabledAndProvider(andProviderId, enabled, providerId, timeline)
        : updateEnabledProvider(enabled, providerId, timeline),
    },
  };
};

const updateExcludedAndProvider = (
  andProviderId: string,
  excluded: boolean,
  providerId: string,
  timeline: TimelineModel
) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId ? { ...andProvider, excluded } : andProvider
          ),
        }
      : provider
  );

const updateExcludedProvider = (excluded: boolean, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          excluded,
        }
      : provider
  );

interface UpdateTimelineProviderExcludedParams {
  id: string;
  providerId: string;
  excluded: boolean;
  timelineById: TimelineById;
  andProviderId?: string;
}

export const updateTimelineProviderExcluded = ({
  id,
  providerId,
  excluded,
  timelineById,
  andProviderId,
}: UpdateTimelineProviderExcludedParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateExcludedAndProvider(andProviderId, excluded, providerId, timeline)
        : updateExcludedProvider(excluded, providerId, timeline),
    },
  };
};

const updateProviderProperties = ({
  excluded,
  field,
  operator,
  providerId,
  timeline,
  value,
}: {
  excluded: boolean;
  field: string;
  operator: QueryOperator;
  providerId: string;
  timeline: TimelineModel;
  value: string | number;
}) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          excluded,
          queryMatch: {
            ...provider.queryMatch,
            field,
            displayField: field,
            value,
            displayValue: value,
            operator,
          },
        }
      : provider
  );

const updateAndProviderProperties = ({
  andProviderId,
  excluded,
  field,
  operator,
  providerId,
  timeline,
  value,
}: {
  andProviderId: string;
  excluded: boolean;
  field: string;
  operator: QueryOperator;
  providerId: string;
  timeline: TimelineModel;
  value: string | number;
}) =>
  timeline.dataProviders.map((provider) =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map((andProvider) =>
            andProvider.id === andProviderId
              ? {
                  ...andProvider,
                  excluded,
                  queryMatch: {
                    ...andProvider.queryMatch,
                    field,
                    displayField: field,
                    value,
                    displayValue: value,
                    operator,
                  },
                }
              : andProvider
          ),
        }
      : provider
  );

interface UpdateTimelineProviderEditPropertiesParams {
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  timelineById: TimelineById;
  value: string | number;
}

export const updateTimelineProviderProperties = ({
  andProviderId,
  excluded,
  field,
  id,
  operator,
  providerId,
  timelineById,
  value,
}: UpdateTimelineProviderEditPropertiesParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? updateAndProviderProperties({
            andProviderId,
            excluded,
            field,
            operator,
            providerId,
            timeline,
            value,
          })
        : updateProviderProperties({
            excluded,
            field,
            operator,
            providerId,
            timeline,
            value,
          }),
    },
  };
};

interface UpdateTimelineProviderKqlQueryParams {
  id: string;
  providerId: string;
  kqlQuery: string;
  timelineById: TimelineById;
}

export const updateTimelineProviderKqlQuery = ({
  id,
  providerId,
  kqlQuery,
  timelineById,
}: UpdateTimelineProviderKqlQueryParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: timeline.dataProviders.map((provider) =>
        provider.id === providerId ? { ...provider, ...{ kqlQuery } } : provider
      ),
    },
  };
};

interface UpdateTimelineItemsPerPageParams {
  id: string;
  itemsPerPage: number;
  timelineById: TimelineById;
}

export const updateTimelineItemsPerPage = ({
  id,
  itemsPerPage,
  timelineById,
}: UpdateTimelineItemsPerPageParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      itemsPerPage,
    },
  };
};

interface UpdateTimelinePageIndexParams {
  id: string;
  activePage: number;
  timelineById: TimelineById;
}

export const updateTimelinePageIndex = ({
  id,
  activePage,
  timelineById,
}: UpdateTimelinePageIndexParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      activePage,
    },
  };
};

interface UpdateTimelinePerPageOptionsParams {
  id: string;
  itemsPerPageOptions: number[];
  timelineById: TimelineById;
}

export const updateTimelinePerPageOptions = ({
  id,
  itemsPerPageOptions,
  timelineById,
}: UpdateTimelinePerPageOptionsParams) => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      itemsPerPageOptions,
    },
  };
};

const removeAndProvider = (andProviderId: string, providerId: string, timeline: TimelineModel) => {
  const providerIndex = timeline.dataProviders.findIndex((p) => p.id === providerId);
  const providerAndIndex = timeline.dataProviders[providerIndex].and.findIndex(
    (p) => p.id === andProviderId
  );
  return [
    ...timeline.dataProviders.slice(0, providerIndex),
    {
      ...timeline.dataProviders[providerIndex],
      and: [
        ...timeline.dataProviders[providerIndex].and.slice(0, providerAndIndex),
        ...timeline.dataProviders[providerIndex].and.slice(providerAndIndex + 1),
      ],
    },
    ...timeline.dataProviders.slice(providerIndex + 1),
  ];
};

const removeProvider = (providerId: string, timeline: TimelineModel) => {
  const providerIndex = timeline.dataProviders.findIndex((p) => p.id === providerId);
  return [
    ...timeline.dataProviders.slice(0, providerIndex),
    ...(timeline.dataProviders[providerIndex].and.length
      ? [
          {
            ...timeline.dataProviders[providerIndex].and.slice(0, 1)[0],
            and: [...timeline.dataProviders[providerIndex].and.slice(1)],
          },
        ]
      : []),
    ...timeline.dataProviders.slice(providerIndex + 1),
  ];
};

interface RemoveTimelineProviderParams {
  id: string;
  providerId: string;
  timelineById: TimelineById;
  andProviderId?: string;
}

export const removeTimelineProvider = ({
  id,
  providerId,
  timelineById,
  andProviderId,
}: RemoveTimelineProviderParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: andProviderId
        ? removeAndProvider(andProviderId, providerId, timeline)
        : removeProvider(providerId, timeline),
    },
  };
};

interface SetDeletedTimelineEventsParams {
  id: string;
  eventIds: string[];
  isDeleted: boolean;
  timelineById: TimelineById;
}

export const setDeletedTimelineEvents = ({
  id,
  eventIds,
  isDeleted,
  timelineById,
}: SetDeletedTimelineEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const deletedEventIds = isDeleted
    ? union(timeline.deletedEventIds, eventIds)
    : timeline.deletedEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  const selectedEventIds = Object.fromEntries(
    Object.entries(timeline.selectedEventIds).filter(
      ([selectedEventId]) => !deletedEventIds.includes(selectedEventId)
    )
  );

  const isSelectAllChecked =
    Object.keys(selectedEventIds).length > 0 ? timeline.isSelectAllChecked : false;

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      deletedEventIds,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

interface SetLoadingTimelineEventsParams {
  id: string;
  eventIds: string[];
  isLoading: boolean;
  timelineById: TimelineById;
}

export const setLoadingTimelineEvents = ({
  id,
  eventIds,
  isLoading,
  timelineById,
}: SetLoadingTimelineEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const loadingEventIds = isLoading
    ? union(timeline.loadingEventIds, eventIds)
    : timeline.loadingEventIds.filter((currentEventId) => !eventIds.includes(currentEventId));

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      loadingEventIds,
    },
  };
};

interface SetSelectedTimelineEventsParams {
  id: string;
  eventIds: Record<string, TimelineNonEcsData[]>;
  isSelectAllChecked: boolean;
  isSelected: boolean;
  timelineById: TimelineById;
}

export const setSelectedTimelineEvents = ({
  id,
  eventIds,
  isSelectAllChecked = false,
  isSelected,
  timelineById,
}: SetSelectedTimelineEventsParams): TimelineById => {
  const timeline = timelineById[id];

  const selectedEventIds = isSelected
    ? { ...timeline.selectedEventIds, ...eventIds }
    : omit(Object.keys(eventIds), timeline.selectedEventIds);

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      selectedEventIds,
      isSelectAllChecked,
    },
  };
};

interface UnPinTimelineEventParams {
  id: string;
  eventId: string;
  timelineById: TimelineById;
}

export const unPinTimelineEvent = ({
  id,
  eventId,
  timelineById,
}: UnPinTimelineEventParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      pinnedEventIds: omit(eventId, timeline.pinnedEventIds),
    },
  };
};

interface UpdateHighlightedDropAndProviderIdParams {
  id: string;
  providerId: string;
  timelineById: TimelineById;
}

export const updateHighlightedDropAndProvider = ({
  id,
  providerId,
  timelineById,
}: UpdateHighlightedDropAndProviderIdParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      highlightedDropAndProviderId: providerId,
    },
  };
};

interface UpdateSavedQueryParams {
  id: string;
  savedQueryId: string | null;
  timelineById: TimelineById;
}

export const updateSavedQuery = ({
  id,
  savedQueryId,
  timelineById,
}: UpdateSavedQueryParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      savedQueryId,
    },
  };
};

interface UpdateFiltersParams {
  id: string;
  filters: Filter[];
  timelineById: TimelineById;
}

export const updateFilters = ({ id, filters, timelineById }: UpdateFiltersParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      filters,
    },
  };
};

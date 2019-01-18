/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filter, getOr, omit, uniq } from 'lodash/fp';
import { TimelineById, TimelineState } from '.';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import { KqlMode, timelineDefaults } from './model';

const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
};

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

interface AddNewTimelineParams {
  id: string;
  show?: boolean;
  timelineById: TimelineById;
}
/** Adds a new `Timeline` to the provided collection of `TimelineById` */
export const addNewTimeline = ({
  id,
  show = false,
  timelineById,
}: AddNewTimelineParams): TimelineById => ({
  ...timelineById,
  [id]: {
    id,
    ...timelineDefaults,
    show,
  },
});

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
  const alreadyExistsAtIndex = timeline.dataProviders.findIndex(p => p.id === provider.id);

  const dataProviders =
    alreadyExistsAtIndex > -1
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

interface AddTimelineAndProviderParams {
  id: string;
  provider: DataProvider;
  timelineById: TimelineById;
}

export const addTimelineAndProvider = ({
  id,
  provider,
  timelineById,
}: AddTimelineAndProviderParams): TimelineById => {
  const timeline = timelineById[id];
  const alreadyExistsAtIndex = timeline.dataProviders.findIndex(
    p => p.id === timeline.highlightedDropAndProviderId
  );
  const newProvider = timeline.dataProviders[alreadyExistsAtIndex];

  newProvider.and = [...newProvider.and, provider];

  const dataProviders = [
    ...timeline.dataProviders.slice(0, alreadyExistsAtIndex),
    newProvider,
    ...timeline.dataProviders.slice(alreadyExistsAtIndex + 1),
  ];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders,
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

interface UpdateTimelineKqlQueryParams {
  id: string;
  kqlQuery: string;
  timelineById: TimelineById;
}

export const updateTimelineKqlQuery = ({
  id,
  kqlQuery,
  timelineById,
}: UpdateTimelineKqlQueryParams): TimelineById => {
  const timeline = timelineById[id];

  return {
    ...timelineById,
    [id]: {
      ...timeline,
      kqlQuery,
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
      description,
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
      title,
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
  range: string;
  timelineById: TimelineById;
}

export const updateTimelineRange = ({
  id,
  range,
  timelineById,
}: UpdateTimelineRangeParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      range,
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

interface UpdateTimelineProviderEnabledParams {
  id: string;
  providerId: string;
  enabled: boolean;
  timelineById: TimelineById;
}

export const updateTimelineProviderEnabled = ({
  id,
  providerId,
  enabled,
  timelineById,
}: UpdateTimelineProviderEnabledParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: timeline.dataProviders.map(provider =>
        provider.id === providerId ? { ...provider, ...{ enabled } } : provider
      ),
    },
  };
};

interface UpdateTimelineProviderExcludedParams {
  id: string;
  providerId: string;
  excluded: boolean;
  timelineById: TimelineById;
}

export const updateTimelineProviderExcluded = ({
  id,
  providerId,
  excluded,
  timelineById,
}: UpdateTimelineProviderExcludedParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: timeline.dataProviders.map(provider =>
        provider.id === providerId ? { ...provider, ...{ excluded } } : provider
      ),
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
      dataProviders: timeline.dataProviders.map(provider =>
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

interface RemoveTimelineProviderParams {
  id: string;
  providerId: string;
  timelineById: TimelineById;
}

export const removeTimelineProvider = ({
  id,
  providerId,
  timelineById,
}: RemoveTimelineProviderParams): TimelineById => {
  const timeline = timelineById[id];
  return {
    ...timelineById,
    [id]: {
      ...timeline,
      dataProviders: filter(p => p.id !== providerId, timeline.dataProviders),
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

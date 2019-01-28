/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, omit, uniq } from 'lodash/fp';
import { TimelineById, TimelineState } from '.';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';
import { KqlMode, timelineDefaults, TimelineModel } from './model';

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

const addAndToProviderInTimeline = (
  id: string,
  provider: DataProvider,
  timeline: TimelineModel,
  timelineById: TimelineById
): TimelineById => {
  const alreadyExistsProviderIndex = timeline.dataProviders.findIndex(
    p => p.id === timeline.highlightedDropAndProviderId
  );
  const newProvider = timeline.dataProviders[alreadyExistsProviderIndex];
  const alreadyExistsAndProviderIndex = newProvider.and.findIndex(p => p.id === provider.id);

  const dataProviders = [
    ...timeline.dataProviders.slice(0, alreadyExistsProviderIndex),
    {
      ...timeline.dataProviders[alreadyExistsProviderIndex],
      and:
        alreadyExistsAndProviderIndex > -1
          ? [
              ...newProvider.and.slice(0, alreadyExistsAndProviderIndex),
              provider,
              ...newProvider.and.slice(alreadyExistsAndProviderIndex + 1),
            ]
          : [...newProvider.and, provider],
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

const updateEnabledAndProvider = (
  andProviderId: string,
  enabled: boolean,
  providerId: string,
  timeline: TimelineModel
) =>
  timeline.dataProviders.map(provider =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map(andProvider =>
            andProvider.id === andProviderId ? { ...andProvider, enabled } : andProvider
          ),
        }
      : provider
  );

const updateEnabledProvider = (enabled: boolean, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map(provider =>
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
  timeline.dataProviders.map(provider =>
    provider.id === providerId
      ? {
          ...provider,
          and: provider.and.map(andProvider =>
            andProvider.id === andProviderId ? { ...andProvider, excluded } : andProvider
          ),
        }
      : provider
  );

const updateExcludedProvider = (excluded: boolean, providerId: string, timeline: TimelineModel) =>
  timeline.dataProviders.map(provider =>
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

const removeAndProvider = (andProviderId: string, providerId: string, timeline: TimelineModel) => {
  const providerIndex = timeline.dataProviders.findIndex(p => p.id === providerId);
  const providerAndIndex = timeline.dataProviders[providerIndex].and.findIndex(
    p => p.id === andProviderId
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
  const providerIndex = timeline.dataProviders.findIndex(p => p.id === providerId);
  return [
    ...timeline.dataProviders.slice(0, providerIndex),
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

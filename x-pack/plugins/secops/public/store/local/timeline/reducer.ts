/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { filter } from 'lodash/fp';
import { Range } from '../../../components/timeline/body/column_headers/range_picker/ranges';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import {
  addProvider,
  createTimeline,
  removeProvider,
  showTimeline,
  updateDataProviderEnabled,
  updateItemsPerPage,
  updateItemsPerPageOptions,
  updatePageIndex,
  updateProviders,
  updateRange,
  updateSort,
} from './actions';
import { timelineDefaults, TimelineModel } from './model';

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TimelineModel;
}

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
}

const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

export const initialTimelineState: TimelineState = {
  timelineById: EMPTY_TIMELINE_BY_ID,
};

interface AddNewTimelineParams {
  id: string;
  timelineById: TimelineById;
}
/** Adds a new `Timeline` to the provided collection of `TimelineById` */
export const addNewTimeline = ({ id, timelineById }: AddNewTimelineParams): TimelineById => ({
  ...timelineById,
  [id]: {
    id,
    ...timelineDefaults,
  },
});

interface UpdateShowTimelineProps {
  id: string;
  show: boolean;
  timelineById: TimelineById;
}

export const updateShowTimeline = ({
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
  range: Range;
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
      dataProviders: timeline.dataProviders.map(
        provider => (provider.id === providerId ? { ...provider, ...{ enabled } } : provider)
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

/** The reducer for all timeline actions  */
export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(createTimeline, (state, { id }) => ({
    ...state,
    timelineById: addNewTimeline({ id, timelineById: state.timelineById }),
  }))
  .case(addProvider, (state, { id, provider }) => ({
    ...state,
    timelineById: addTimelineProvider({ id, provider, timelineById: state.timelineById }),
  }))
  .case(showTimeline, (state, { id, show }) => ({
    ...state,
    timelineById: updateShowTimeline({ id, show, timelineById: state.timelineById }),
  }))
  .case(removeProvider, (state, { id, providerId }) => ({
    ...state,
    timelineById: removeTimelineProvider({ id, providerId, timelineById: state.timelineById }),
  }))
  .case(updateProviders, (state, { id, providers }) => ({
    ...state,
    timelineById: updateTimelineProviders({ id, providers, timelineById: state.timelineById }),
  }))
  .case(updateRange, (state, { id, range }) => ({
    ...state,
    timelineById: updateTimelineRange({ id, range, timelineById: state.timelineById }),
  }))
  .case(updateSort, (state, { id, sort }) => ({
    ...state,
    timelineById: updateTimelineSort({ id, sort, timelineById: state.timelineById }),
  }))
  .case(updateDataProviderEnabled, (state, { id, enabled, providerId }) => ({
    ...state,
    timelineById: updateTimelineProviderEnabled({
      id,
      enabled,
      providerId,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateItemsPerPage, (state, { id, itemsPerPage }) => ({
    ...state,
    timelineById: updateTimelineItemsPerPage({
      id,
      itemsPerPage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updatePageIndex, (state, { id, activePage }) => ({
    ...state,
    timelineById: updateTimelinePageIndex({
      id,
      activePage,
      timelineById: state.timelineById,
    }),
  }))
  .case(updateItemsPerPageOptions, (state, { id, itemsPerPageOptions }) => ({
    ...state,
    timelineById: updateTimelinePerPageOptions({
      id,
      itemsPerPageOptions,
      timelineById: state.timelineById,
    }),
  }))
  .build();

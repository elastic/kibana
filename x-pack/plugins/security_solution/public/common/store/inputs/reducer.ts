/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { InputsModelId } from './constants';
import { getIntervalSettings, getTimeRangeSettings } from '../../utils/default_date_settings';
import {
  deleteAllQuery,
  setAbsoluteRangeDatePicker,
  setDuration,
  setFullScreen,
  setInspectionParameter,
  setQuery,
  setRelativeRangeDatePicker,
  setTimelineRangeDatePicker,
  startAutoReload,
  stopAutoReload,
  toggleTimelineLinkTo,
  deleteOneQuery,
  setFilterQuery,
  setSavedQuery,
  setSearchBarFilter,
  removeLinkTo,
  addLinkTo,
  toggleSocTrendsLinkTo,
} from './actions';
import {
  setIsInspected,
  toggleLockTimeline,
  updateInputTimerange,
  upsertQuery,
  addInputLink,
  removeInputLink,
  deleteOneQuery as helperDeleteOneQuery,
  updateInputFullScreen,
  toggleLockSocTrends,
} from './helpers';
import type { InputsModel, TimeRange } from './model';

export type InputsState = InputsModel;

const { socTrends: socTrendsUnused, ...timeRangeSettings } = getTimeRangeSettings(false);

export const initialInputsState: InputsState = {
  global: {
    timerange: {
      kind: 'relative',
      ...timeRangeSettings,
    },
    queries: [],
    policy: getIntervalSettings(false),
    linkTo: [InputsModelId.timeline],
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    fullScreen: false,
  },
  timeline: {
    timerange: {
      kind: 'relative',
      ...timeRangeSettings,
    },
    queries: [],
    policy: getIntervalSettings(false),
    linkTo: [InputsModelId.global],
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    fullScreen: false,
  },
};

export const createInitialInputsState = (socTrendsEnabled: boolean): InputsState => {
  const { from, fromStr, to, toStr, socTrends } = getTimeRangeSettings();
  const { kind, duration } = getIntervalSettings();
  return {
    global: {
      timerange: {
        kind: 'relative',
        fromStr,
        toStr,
        from,
        to,
      },
      queries: [],
      policy: {
        kind,
        duration,
      },
      linkTo: [InputsModelId.timeline, ...(socTrendsEnabled ? [InputsModelId.socTrends] : [])],
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      fullScreen: false,
    },
    timeline: {
      timerange: {
        kind: 'relative',
        fromStr,
        toStr,
        from,
        to,
      },
      queries: [],
      policy: {
        kind,
        duration,
      },
      linkTo: [InputsModelId.global],
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      fullScreen: false,
    },
    ...(socTrendsEnabled
      ? {
          socTrends: {
            timerange: socTrends,
            linkTo: [InputsModelId.global],
            policy: {
              kind,
              duration,
            },
          },
        }
      : {}),
  };
};

export const inputsReducer = reducerWithInitialState(initialInputsState)
  .case(setTimelineRangeDatePicker, (state, { from, to }) => {
    return {
      ...state,
      global: {
        ...state.global,
        // needs to be emptied, but socTrends should remain if defined
        linkTo: state.global.linkTo.filter((i) => i !== InputsModelId.timeline),
      },
      timeline: {
        ...state.timeline,
        timerange: {
          kind: 'absolute',
          fromStr: undefined,
          toStr: undefined,
          from,
          to,
        },
        linkTo: [],
      },
    };
  })
  .case(
    setAbsoluteRangeDatePicker,
    (state, { id, from, to, fromStr = undefined, toStr = undefined }) => {
      const timerange: TimeRange = {
        kind: 'absolute',
        fromStr,
        toStr,
        from,
        to,
      };
      return updateInputTimerange(id, timerange, state);
    }
  )
  .case(setRelativeRangeDatePicker, (state, { id, fromStr, from, to, toStr }) => {
    const timerange: TimeRange = {
      kind: 'relative',
      fromStr,
      toStr,
      from,
      to,
    };
    return updateInputTimerange(id, timerange, state);
  })
  .case(setFullScreen, (state, { id, fullScreen }) => {
    return updateInputFullScreen(id, fullScreen, state);
  })
  .case(deleteAllQuery, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      queries: state.global.queries.slice(state.global.queries.length),
    },
  }))
  .case(setQuery, (state, { inputId, id, inspect, loading, refetch, searchSessionId }) =>
    upsertQuery({ inputId, id, inspect, loading, refetch, state, searchSessionId })
  )
  .case(deleteOneQuery, (state, { inputId, id }) => helperDeleteOneQuery({ inputId, id, state }))
  .case(setDuration, (state, { id, duration }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        duration,
      },
    },
  }))
  .case(startAutoReload, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        kind: 'interval',
      },
    },
  }))
  .case(stopAutoReload, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        kind: 'manual',
      },
    },
  }))
  .case(toggleTimelineLinkTo, (state) => toggleLockTimeline(state))
  .case(toggleSocTrendsLinkTo, (state) => toggleLockSocTrends(state))
  .case(
    setInspectionParameter,
    (state, { id, inputId, isInspected, selectedInspectIndex, searchSessionId }) =>
      setIsInspected({ id, inputId, isInspected, selectedInspectIndex, state, searchSessionId })
  )
  .case(removeLinkTo, (state, linkToIds) => removeInputLink(linkToIds, state))
  .case(addLinkTo, (state, linkToIds) => addInputLink(linkToIds, state))
  .case(setFilterQuery, (state, { id, query, language }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      query: {
        query,
        language,
      },
    },
  }))
  .case(setSavedQuery, (state, { id, savedQuery }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      savedQuery,
    },
  }))
  .case(setSearchBarFilter, (state, { id, filters }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      filters,
    },
  }))
  .build();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

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
  removeTimelineLinkTo,
  removeGlobalLinkTo,
  addGlobalLinkTo,
  addTimelineLinkTo,
  deleteOneQuery,
  setFilterQuery,
  setSavedQuery,
  setSearchBarFilter,
} from './actions';
import {
  setIsInspected,
  toggleLockTimeline,
  updateInputTimerange,
  upsertQuery,
  removeGlobalLink,
  addGlobalLink,
  removeTimelineLink,
  addTimelineLink,
  deleteOneQuery as helperDeleteOneQuery,
  updateInputFullScreen,
} from './helpers';
import { InputsModel, TimeRange } from './model';

export type InputsState = InputsModel;

export const initialInputsState: InputsState = {
  global: {
    timerange: {
      kind: 'relative',
      ...getTimeRangeSettings(false),
    },
    queries: [],
    policy: getIntervalSettings(false),
    linkTo: ['timeline'],
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
      ...getTimeRangeSettings(false),
    },
    queries: [],
    policy: getIntervalSettings(false),
    linkTo: ['global'],
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    fullScreen: false,
  },
};

export const createInitialInputsState = (): InputsState => {
  const { from, fromStr, to, toStr } = getTimeRangeSettings();
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
      linkTo: ['timeline'],
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
      linkTo: ['global'],
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      fullScreen: false,
    },
  };
};

export const inputsReducer = reducerWithInitialState(initialInputsState)
  .case(setTimelineRangeDatePicker, (state, { from, to }) => {
    return {
      ...state,
      global: {
        ...state.global,
        linkTo: [],
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
  .case(setAbsoluteRangeDatePicker, (state, { id, from, to }) => {
    const timerange: TimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from,
      to,
    };
    return updateInputTimerange(id, timerange, state);
  })
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
  .case(setQuery, (state, { inputId, id, inspect, loading, refetch }) =>
    upsertQuery({ inputId, id, inspect, loading, refetch, state })
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
  .case(toggleTimelineLinkTo, (state, { linkToId }) => toggleLockTimeline(linkToId, state))
  .case(setInspectionParameter, (state, { id, inputId, isInspected, selectedInspectIndex }) =>
    setIsInspected({ id, inputId, isInspected, selectedInspectIndex, state })
  )
  .case(removeGlobalLinkTo, (state) => removeGlobalLink(state))
  .case(addGlobalLinkTo, (state, { linkToId }) => addGlobalLink(linkToId, state))
  .case(removeTimelineLinkTo, (state) => removeTimelineLink(state))
  .case(addTimelineLinkTo, (state, { linkToId }) => addTimelineLink(linkToId, state))
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

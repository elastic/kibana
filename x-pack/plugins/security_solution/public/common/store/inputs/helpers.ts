/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import { getFutureTimeRange, getPreviousTimeRange } from '../../utils/get_time_range';
import type {
  Inputs,
  InputsModel,
  InputsRange,
  InspectQuery,
  Refetch,
  RefetchKql,
  TimeRange,
} from './model';
import type { InputsModelId } from './constants';
import { socTrendsId, timelineId } from './constants';

export const updateInputFullScreen = (
  inputId: InputsModelId,
  fullScreen: boolean,
  state: InputsModel
): InputsModel => ({
  ...state,
  global: {
    ...state.global,
    fullScreen: inputId === 'global' ? fullScreen : state.global.fullScreen,
  },
  timeline: {
    ...state.timeline,
    fullScreen: inputId === 'timeline' ? fullScreen : state.timeline.fullScreen,
  },
});

const getTimeRange = (timerange: TimeRange, inputId: InputsModelId, linkToId: InputsModelId) => {
  if ((inputId === 'global' || inputId === 'timeline') && linkToId === 'socTrends') {
    return getPreviousTimeRange(timerange);
  }
  if (inputId === 'socTrends' && (linkToId === 'global' || linkToId === 'timeline')) {
    return getFutureTimeRange(timerange);
  }
  return timerange;
};

export const updateInputTimerange = (
  inputId: InputsModelId,
  timerange: TimeRange,
  state: InputsModel
): InputsModel => {
  const input = get(inputId, state);
  if (input != null) {
    return {
      ...[inputId, ...input.linkTo].reduce<InputsModel>(
        (acc: InputsModel, linkToId: InputsModelId) => ({
          ...acc,
          [linkToId]: {
            ...get(linkToId, state),
            timerange: getTimeRange(timerange, inputId, linkToId),
          },
        }),
        inputId === 'timeline' ? { ...state, global: { ...state.global, linkTo: [] } } : state
      ),
    };
  }
  return state;
};

export const toggleLockTimeline = (state: InputsModel): InputsModel => {
  const linkToIdAlreadyExist = state.global.linkTo.indexOf('timeline');
  return linkToIdAlreadyExist > -1
    ? removeInputLink(['global', 'timeline'], state)
    : addInputLink(['global', 'timeline'], state);
};

export const toggleLockSocTrends = (state: InputsModel): InputsModel => {
  const linkToIdAlreadyExist = state.global.linkTo.indexOf('socTrends');
  return linkToIdAlreadyExist > -1
    ? removeInputLink(['global', 'socTrends'], state)
    : addInputLink(['global', 'socTrends'], state);
};

export interface UpdateQueryParams {
  id: string;
  inputId: 'global' | 'timeline';
  inspect: InspectQuery | null;
  loading: boolean;
  refetch: Refetch | RefetchKql;
  state: InputsModel;
}

export const upsertQuery = ({
  inputId,
  id,
  inspect,
  loading,
  refetch,
  state,
}: UpdateQueryParams): InputsModel => {
  const queryIndex = state[inputId].queries.findIndex((q) => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        queryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, queryIndex),
              {
                id,
                inspect,
                isInspected: state[inputId].queries[queryIndex].isInspected,
                loading,
                refetch,
                selectedInspectIndex: state[inputId].queries[queryIndex].selectedInspectIndex,
              },
              ...state[inputId].queries.slice(queryIndex + 1),
            ]
          : [
              ...state[inputId].queries,
              {
                id,
                inspect,
                isInspected: false,
                loading,
                refetch,
                selectedInspectIndex: 0,
              },
            ],
    },
  };
};

export interface SetIsInspectedParams {
  id: string;
  inputId: 'global' | 'timeline';
  isInspected: boolean;
  selectedInspectIndex: number;
  state: InputsModel;
}

export const setIsInspected = ({
  id,
  inputId,
  isInspected,
  selectedInspectIndex,
  state,
}: SetIsInspectedParams): InputsModel => {
  const myQueryIndex = state[inputId].queries.findIndex((q) => q.id === id);
  const myQuery = myQueryIndex > -1 ? state[inputId].queries[myQueryIndex] : null;

  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        myQueryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, myQueryIndex),
              { ...myQuery, isInspected, selectedInspectIndex },
              ...state[inputId].queries.slice(myQueryIndex + 1),
            ]
          : [...state[inputId].queries],
    },
  };
};

export const addInputLink = (linkToIds: InputsModelId[], state: InputsModel): InputsModel => {
  if (linkToIds.length !== 2) {
    throw new Error('Only link 2 input states at a time');
  }
  if (linkToIds.includes('socTrends') && linkToIds.includes('timeline')) {
    throw new Error('Do not link socTrends to timeline. Only link socTrends to global');
  }
  if (Array.from(new Set(linkToIds)).length === 1) {
    throw new Error('Input linkTo cannot link to itself');
  }
  if (linkToIds.includes('timeline') && linkToIds.includes('global')) {
    const socTrends =
      state.timeline.linkTo.includes('socTrends') || state.global.linkTo.includes('socTrends')
        ? [socTrendsId]
        : [];
    return {
      ...state,
      timeline: {
        ...state.timeline,
        linkTo: [...socTrends, 'global'],
      },
      global: {
        ...state.global,
        linkTo: [...socTrends, 'timeline'],
      },
      // TODO: remove state.socTrends check when socTrendsEnabled feature flag removed
      ...(state.socTrends && socTrends.length
        ? {
            socTrends: {
              ...state.socTrends,
              linkTo: ['global', 'timeline'],
            },
          }
        : {}),
    };
  }

  if (linkToIds.includes('socTrends') && linkToIds.includes('global')) {
    const timeline = state.global.linkTo.includes('timeline') ? [timelineId] : [];
    return {
      ...state,
      // TODO: remove state.socTrends check when socTrendsEnabled feature flag removed
      ...(state.socTrends
        ? {
            socTrends: {
              ...state.socTrends,
              linkTo: [...timeline, 'global'],
            },
          }
        : {}),
      global: {
        ...state.global,
        linkTo: [...timeline, 'socTrends'],
      },
      ...(timeline.length
        ? {
            timeline: {
              ...state.timeline,
              linkTo: ['global', 'socTrends'],
            },
          }
        : {}),
    };
  }
  return state;
};

export const removeInputLink = (linkToIds: InputsModelId[], state: InputsModel): InputsModel => {
  if (linkToIds.length !== 2) {
    throw new Error('Only remove linkTo from 2 input states at a time');
  }
  if (linkToIds.includes('socTrends') && linkToIds.includes('timeline')) {
    throw new Error(
      'Do not remove link socTrends to timeline. Only remove link socTrends to global'
    );
  }
  if (Array.from(new Set(linkToIds)).length === 1) {
    throw new Error('Input linkTo cannot remove link to itself');
  }
  if (linkToIds.includes('timeline') && linkToIds.includes('global')) {
    const socTrends =
      state.timeline.linkTo.includes('socTrends') || state.global.linkTo.includes('socTrends')
        ? [socTrendsId]
        : [];
    return {
      ...state,
      timeline: {
        ...state.timeline,
        linkTo: [],
      },
      global: {
        ...state.global,
        linkTo: socTrends,
      },
      // TODO: remove state.socTrends check when socTrendsEnabled feature flag removed
      ...(state.socTrends && socTrends.length
        ? {
            socTrends: {
              ...state.socTrends,
              linkTo: ['global'],
            },
          }
        : {}),
    };
  }

  if (linkToIds.includes('socTrends') && linkToIds.includes('global')) {
    const timeline = state.global.linkTo.includes('timeline') ? [timelineId] : [];
    return {
      ...state,
      // TODO: remove state.socTrends check when socTrendsEnabled feature flag removed
      ...(state.socTrends
        ? {
            socTrends: {
              ...state.socTrends,
              linkTo: [],
            },
          }
        : {}),
      global: {
        ...state.global,
        linkTo: timeline,
      },
      ...(timeline.length
        ? {
            timeline: {
              ...state.timeline,
              linkTo: ['global'],
            },
          }
        : {}),
    };
  }
  return state;
};

export interface DeleteOneQueryParams {
  id: string;
  inputId: 'global' | 'timeline';
  state: InputsModel;
}

export const deleteOneQuery = ({ inputId, id, state }: DeleteOneQueryParams): InputsModel => {
  const queryIndex = state[inputId].queries.findIndex((q) => q.id === id);
  return {
    ...state,
    [inputId]: {
      ...get(inputId, state),
      queries:
        queryIndex > -1
          ? [
              ...state[inputId].queries.slice(0, queryIndex),
              ...state[inputId].queries.slice(queryIndex + 1),
            ]
          : [...state[inputId].queries],
    },
  };
};

export const isQueryInput = (inputs: Inputs): inputs is InputsRange => {
  if ('queries' in inputs) {
    return true;
  }
  return false;
};

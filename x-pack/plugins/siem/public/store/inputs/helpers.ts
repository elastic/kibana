/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { InputsModel, InputsModelId, TimeRange } from './model';

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
            timerange,
          },
        }),
        inputId === 'timeline' ? { ...state, global: { ...state.global, linkTo: [] } } : state
      ),
    };
  }
  return state;
};

export const toggleLockTimeline = (linkToId: InputsModelId, state: InputsModel): InputsModel => {
  const linkToIdAlreadyExist = state.global.linkTo.indexOf(linkToId);
  return {
    ...state,
    global: {
      ...state.global,
      timerange: linkToIdAlreadyExist > -1 ? state.global.timerange : state.timeline.timerange,
      linkTo:
        linkToIdAlreadyExist > -1
          ? [
              ...state.global.linkTo.slice(0, linkToIdAlreadyExist),
              ...state.global.linkTo.slice(linkToIdAlreadyExist + 1),
            ]
          : [...state.global.linkTo, linkToId],
    },
    timeline: {
      ...state.timeline,
      linkTo: linkToIdAlreadyExist > -1 ? [] : ['global'],
    },
  };
};

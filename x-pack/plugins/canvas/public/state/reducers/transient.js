/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { set, del } from 'object-path-immutable';
import { restoreHistory } from '../actions/history';
import * as actions from '../actions/transient';
import { removeElement, removeElements } from '../actions/elements';
import { setRefreshInterval } from '../actions/workpad';

export const transientReducer = handleActions(
  {
    // clear all the resolved args when restoring the history
    // TODO: we shouldn't need to reset the resolved args for history
    [restoreHistory]: transientState => set(transientState, 'resolvedArgs', {}),

    [removeElement]: (transientState, { payload: { elementId } }) => {
      const { selectedElement } = transientState;
      return del(
        {
          ...transientState,
          selectedElement: selectedElement === elementId ? null : selectedElement,
        },
        ['resolvedArgs', elementId]
      );
    },

    [removeElements]: (transientState, { payload: { elementIds } }) => {
      const { selectedElement } = transientState;
      return del(
        {
          ...transientState,
          selectedElement: elementIds.indexOf(selectedElement) === -1 ? selectedElement : null,
        },
        ['resolvedArgs', elementIds]
      );
    },

    [actions.setEditing]: (transientState, { payload }) => {
      return set(transientState, 'editing', Boolean(payload));
    },

    [actions.setFullscreen]: (transientState, { payload }) => {
      return set(transientState, 'fullscreen', Boolean(payload));
    },

    [actions.selectElement]: (transientState, { payload }) => {
      return {
        ...transientState,
        selectedElement: payload || null,
      };
    },

    [setRefreshInterval]: (transientState, { payload }) => {
      return { ...transientState, refresh: { interval: Number(payload) || 0 } };
    },
  },
  {}
);

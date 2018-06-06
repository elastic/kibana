/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createActions } from '../util';

const { actionTypes, actions } = createActions([
  'DRAG_SELECT_UPDATE',
  'DRAG_SELECT_FINISH',
]);

export const dragSelectActions = actions;

// default state and reducer
const ALLOW_CELL_RANGE_SELECTION = true;
const defaultState = {
  cellMouseoverActive: true,
  disableDragSelectOnMouseLeave: true,
  dragging: false,
  selectedElements: []
};

export const dragSelectReducer = (state = defaultState, action) => {
  switch (action.type) {
    case actionTypes.DRAG_SELECT_UPDATE:
      if (!ALLOW_CELL_RANGE_SELECTION) {
        return state;
      }
      return {
        ...state,
        cellMouseoverActive: false,
        disableDragSelectOnMouseLeave: false,
        dragging: true
      };

    case actionTypes.DRAG_SELECT_FINISH:
      let elements = action.payload;
      if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
        elements = [elements[0]];
      }

      if (elements.length === 0) {
        return state;
      }
      return {
        ...state,
        cellMouseoverActive: true,
        disableDragSelectOnMouseLeave: true,
        dragging: false,
        selectedElements: elements
      };

    default:
      return state;
  }
};

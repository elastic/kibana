/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// default state and reducer
import { createModule } from '../util';

const ALLOW_CELL_RANGE_SELECTION = true;

const defaultState = {
  cellMouseoverActive: true,
  disableDragSelectOnMouseLeave: true,
  dragging: false,
  selectedElements: []
};

const actionDefs = {
  DRAG_SELECT_UPDATE: () => ({
    cellMouseoverActive: false,
    disableDragSelectOnMouseLeave: false,
    dragging: true,
    selectedElements: []
  }),
  DRAG_SELECT_FINISH: (elements) => {
    if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
      elements = [elements[0]];
    }

    if (elements.length === 0) {
      return null;
    }

    return {
      cellMouseoverActive: true,
      disableDragSelectOnMouseLeave: true,
      dragging: false,
      selectedElements: elements
    };
  }
};

export const dragSelectModule = createModule({ defaultState, actionDefs });

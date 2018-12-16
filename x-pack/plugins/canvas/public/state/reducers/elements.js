/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { assign, push, del, set } from 'object-path-immutable';
import { get } from 'lodash';
import * as actions from '../actions/elements';

const getLocation = type => (type === 'group' ? 'groups' : 'elements');

const getLocationFromIds = (workpadState, pageId, elementId) =>
  workpadState.pages.find(p => p.id === pageId).groups.find(e => e.id === elementId)
    ? 'groups'
    : 'elements';

function getPageIndexById(workpadState, pageId) {
  return get(workpadState, 'pages', []).findIndex(page => page.id === pageId);
}

function getElementIndexById(page, elementId, location) {
  return page[location].findIndex(element => element.id === elementId);
}

function assignElementProperties(workpadState, pageId, elementId, props) {
  const pageIndex = getPageIndexById(workpadState, pageId);
  const location = getLocationFromIds(workpadState, pageId, elementId);
  const elementsPath = ['pages', pageIndex, location];
  const elementIndex = get(workpadState, elementsPath, []).findIndex(
    element => element.id === elementId
  );

  if (pageIndex === -1 || elementIndex === -1) return workpadState;

  // remove any AST value from the element caused by https://github.com/elastic/kibana-canvas/issues/260
  // TODO: remove this after a bit of time
  const cleanWorkpadState = del(workpadState, elementsPath.concat([elementIndex, 'ast']));

  return assign(cleanWorkpadState, elementsPath.concat(elementIndex), props);
}

function moveElementLayer(workpadState, pageId, elementId, movement, location) {
  const pageIndex = getPageIndexById(workpadState, pageId);
  const elementIndex = getElementIndexById(workpadState.pages[pageIndex], elementId, location);
  const elements = get(workpadState, ['pages', pageIndex, location]);
  const from = elementIndex;

  const to = (function() {
    if (movement < Infinity && movement > -Infinity) return elementIndex + movement;
    if (movement === Infinity) return elements.length - 1;
    if (movement === -Infinity) return 0;
    throw new Error('Invalid element layer movement');
  })();

  if (to > elements.length - 1 || to < 0) return workpadState;

  // Common
  const newElements = elements.slice(0);
  newElements.splice(to, 0, newElements.splice(from, 1)[0]);

  return set(workpadState, ['pages', pageIndex, location], newElements);
}

export const elementsReducer = handleActions(
  {
    // TODO: This takes the entire element, which is not necessary, it could just take the id.
    [actions.setExpression]: (workpadState, { payload }) => {
      const { expression, pageId, elementId } = payload;
      return assignElementProperties(workpadState, pageId, elementId, { expression });
    },
    [actions.setFilter]: (workpadState, { payload }) => {
      const { filter, pageId, elementId } = payload;
      return assignElementProperties(workpadState, pageId, elementId, { filter });
    },
    [actions.setMultiplePositions]: (workpadState, { payload }) =>
      payload.repositionedElements.reduce(
        (previousWorkpadState, { position, pageId, elementId }) =>
          assignElementProperties(previousWorkpadState, pageId, elementId, { position }),
        workpadState
      ),
    [actions.elementLayer]: (workpadState, { payload: { pageId, elementId, movement } }) => {
      const location = getLocationFromIds(workpadState, pageId, elementId);
      return moveElementLayer(workpadState, pageId, elementId, movement, location);
    },
    [actions.addElement]: (workpadState, { payload: { pageId, element } }) => {
      const pageIndex = getPageIndexById(workpadState, pageId);
      if (pageIndex < 0) return workpadState;
      return push(workpadState, ['pages', pageIndex, getLocation(element.position.type)], element);
    },
    [actions.duplicateElement]: (workpadState, { payload: { pageId, element } }) => {
      const pageIndex = getPageIndexById(workpadState, pageId);
      if (pageIndex < 0) return workpadState;
      return push(workpadState, ['pages', pageIndex, getLocation(element.position.type)], element);
    },
    [actions.removeElements]: (workpadState, { payload: { pageId, elementIds } }) => {
      const pageIndex = getPageIndexById(workpadState, pageId);
      if (pageIndex < 0) return workpadState;

      const elementIndices = elementIds
        .map(elementId => {
          const location = getLocationFromIds(workpadState, pageId, elementId);
          return {
            location,
            index: getElementIndexById(workpadState.pages[pageIndex], elementId, location),
          };
        })
        .sort((a, b) => b.index - a.index); // deleting from end toward beginning, otherwise indices will become off - todo fuse loops!

      return elementIndices.reduce((state, { location, index }) => {
        return del(state, ['pages', pageIndex, location, index]);
      }, workpadState);
    },
  },
  {}
);

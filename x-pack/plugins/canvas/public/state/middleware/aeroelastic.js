/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowEqual } from 'recompose';
import { matrixToAngle } from '../../lib/aeroelastic/matrix';
import {
  addElement,
  removeElements,
  insertNodes,
  elementLayer,
  setMultiplePositions,
  fetchAllRenderables,
} from '../actions/elements';
import { restoreHistory } from '../actions/history';
import { selectElement } from '../actions/transient';
import { addPage, removePage, duplicatePage } from '../actions/pages';
import { appReady } from '../actions/app';
import { setWorkpad } from '../actions/workpad';
import { getNodes, getPages, getSelectedPage, getSelectedElement } from '../selectors/workpad';

const isGroupId = id => id.startsWith('group');


const shapeToElement = shape => {
  return {
    left: shape.transformMatrix[12] - shape.a,
    top: shape.transformMatrix[13] - shape.b,
    width: shape.a * 2,
    height: shape.b * 2,
    angle: Math.round((matrixToAngle(shape.transformMatrix) * 180) / Math.PI),
    parent: shape.parent || null,
    type: shape.type === 'group' ? 'group' : 'element',
  };
};

const updateGlobalPositions = (setMultiplePositions, { shapes, gestureEnd }, unsortedElements) => {
  const ascending = (a, b) => (a.id < b.id ? -1 : 1);
  const relevant = s => s.type !== 'annotation' && s.subtype !== 'adHocGroup';
  const elements = unsortedElements.filter(relevant).sort(ascending);
  const repositionings = shapes
    .filter(relevant)
    .sort(ascending)
    .map((shape, i) => {
      const element = elements[i];
      const elemPos = element && element.position;
      if (elemPos && gestureEnd) {
        // get existing position information from element
        const oldProps = {
          left: elemPos.left,
          top: elemPos.top,
          width: elemPos.width,
          height: elemPos.height,
          angle: Math.round(elemPos.angle),
          type: elemPos.type,
          parent: elemPos.parent || null,
        };

        // cast shape into element-like object to compare
        const newProps = shapeToElement(shape);

        if (1 / newProps.angle === -Infinity) {
          newProps.angle = 0;
        } // recompose.shallowEqual discerns between 0 and -0

        return shallowEqual(oldProps, newProps)
          ? null
          : { position: newProps, elementId: shape.id };
      }
    })
    .filter(identity);
  if (repositionings.length) {
    setMultiplePositions(repositionings);
  }
};

const id = element => element.id;
export const aeroelastic = ({ dispatch, getState }) => {
  // When aeroelastic updates an element, we need to dispatch actions to notify redux of the changes

  const onChangeCallback = ({ state }) => {
    const nextScene = state.currentScene;
    if (!nextScene.gestureEnd) {
      return;
    } // only update redux on gesture end
    // TODO: check for gestureEnd on element selection

    // read current data out of redux
    const page = getSelectedPage(getState());
    const elements = getNodes(getState(), page);
    const selectedElement = getSelectedElement(getState());

    const shapes = nextScene.shapes;
    const persistableGroups = shapes.filter(s => s.subtype === 'persistentGroup');
    const persistedGroups = elements.filter(e => isGroupId(e.id));

    idDuplicateCheck(persistableGroups);
    idDuplicateCheck(persistedGroups);

    persistableGroups.forEach(g => {
      if (
        !persistedGroups.find(p => {
          if (!p.id) {
            throw new Error('Element has no id');
          }
          return p.id === g.id;
        })
      ) {
        const partialElement = {
          id: g.id,
          filter: undefined,
          expression: 'shape fill="rgba(255,255,255,0)" | render',
          position: {
            ...shapeToElement(g),
          },
        };
        dispatch(addElement(page, partialElement));
      }
    });

    const elementsToRemove = persistedGroups.filter(
      // list elements for removal if they're not in the persistable set, or if there's no longer an associated element
      // the latter of which shouldn't happen, so it's belts and braces
      p =>
        !persistableGroups.find(g => p.id === g.id) ||
        !elements.find(e => e.position.parent === p.id)
    );

    updateGlobalPositions(
      positions => dispatch(setMultiplePositions(positions.map(p => ({ ...p, pageId: page })))),
      nextScene,
      elements
    );

    if (elementsToRemove.length) {
      // remove elements for groups that were ungrouped
      dispatch(removeElements(elementsToRemove.map(e => e.id), page));
    }

    // set the selected element on the global store, if one element is selected
    const selectedShape = nextScene.selectedPrimaryShapes[0];
    if (nextScene.selectedShapes.length === 1 && !isGroupId(selectedShape)) {
      if (selectedShape !== (selectedElement && selectedElement.id)) {
        dispatch(selectElement(selectedShape));
      }
    } else {
      // otherwise, clear the selected element state
      // even for groups - TODO add handling for groups, esp. persistent groups - common styling etc.
      if (selectedElement) {
        const shape = shapes.find(s => s.id === selectedShape);
        // don't reset if eg. we're in the middle of converting an ad hoc group into a persistent one
        if (!shape || shape.subtype !== 'adHocGroup') {
          dispatch(selectElement(null));
        }
      }
    }
  };

  const createStore = page =>
    aero.createStore(
      {
        primaryUpdate: null,
        currentScene: { shapes: [], configuration: aeroelasticConfiguration },
      },
      onChangeCallback,
      page
    );

  const populateWithElements = page => {
    const newShapes = getNodes(getState(), page)
      .map(elementToShape)
      // filtering to eliminate residual element of a possible group that had been deleted in Redux
      .filter((d, i, a) => !isGroupId(d.id) || a.find(s => s.parent === d.id));
    idDuplicateCheck(newShapes);
    missingParentCheck(newShapes);
    return aero.commit(page, 'restateShapesEvent', { newShapes }, { silent: true });
  };

  const selectShape = (page, id) => {
    aero.commit(page, 'shapeSelect', { shapes: [id] });
  };

  const unselectShape = page => {
    aero.commit(page, 'shapeSelect', { shapes: [] });
  };

  return next => action => {
    // get information before the state is changed
    const prevPage = getSelectedPage(getState());
    const prevElements = getNodes(getState(), prevPage);

    if (action.type === setWorkpad.toString()) {
      const pages = action.payload.pages;
      aero.clearStores();
      // Create the aeroelastic store, which happens once per page creation; disposed on workbook change.
      // TODO: consider implementing a store removal upon page removal to reclaim a small amount of storage
      pages.map(p => p.id).forEach(createStore);
    }

    if (action.type === restoreHistory.toString()) {
      aero.clearStores();
      action.payload.workpad.pages.map(p => p.id).forEach(createStore);
    }

    if (action.type === appReady.toString()) {
      const pages = getPages(getState());
      aero.clearStores();
      pages.map(p => p.id).forEach(createStore);
    }

    let lastPageRemoved = false;
    if (action.type === removePage.toString()) {
      const preRemoveState = getState();
      if (getPages(preRemoveState).length <= 1) {
        lastPageRemoved = true;
      }

      aero.removeStore(action.payload);
    }

    next(action);

    switch (action.type) {
      case appReady.toString():
      case restoreHistory.toString():
      case setWorkpad.toString():
        // Populate the aeroelastic store, which only happens once per page creation; disposed on workbook change.
        getPages(getState())
          .map(p => p.id)
          .forEach(populateWithElements);
        break;

      case addPage.toString():
      case duplicatePage.toString():
        const newPage = getSelectedPage(getState());
        createStore(newPage);
        if (action.type === duplicatePage.toString()) {
          dispatch(fetchAllRenderables());
        }

        populateWithElements(newPage);
        break;

      case removePage.toString():
        const postRemoveState = getState();
        if (lastPageRemoved) {
          const freshPage = getSelectedPage(postRemoveState);
          createStore(freshPage);
        }
        break;

      case selectElement.toString():
        // without this condition, a mouse release anywhere will trigger it, leading to selection of whatever is
        // underneath the pointer (maybe nothing) when the mouse is released
        if (action.payload) {
          selectShape(prevPage, action.payload);
        } else {
          unselectShape(prevPage);
        }

        break;

      case removeElements.toString():
      case addElement.toString():
      case insertNodes.toString():
      case elementLayer.toString():
      case setMultiplePositions.toString():
        const page = getSelectedPage(getState());
        const elements = getNodes(getState(), page);

        // TODO: add a better check for elements changing, including their position, ids, etc.
        const shouldResetState =
          prevPage !== page || !shallowEqual(prevElements.map(id), elements.map(id));
        if (shouldResetState) {
          populateWithElements(page);
        }

        if (
          action.type !== setMultiplePositions.toString() &&
          action.type !== elementLayer.toString()
        ) {
          unselectShape(prevPage);
        }

        break;
    }
  };
};

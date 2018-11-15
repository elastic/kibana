/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowEqual } from 'recompose';
import { aeroelastic as aero } from '../../lib/aeroelastic_kibana';
import { matrixToAngle } from '../../lib/aeroelastic/matrix';
import {
  addElement,
  removeElements,
  duplicateElement,
  elementLayer,
  setPosition,
  fetchAllRenderables,
} from '../actions/elements';
import { restoreHistory } from '../actions/history';
import { selectElement } from '../actions/transient';
import { addPage, removePage, duplicatePage } from '../actions/pages';
import { appReady } from '../actions/app';
import { setWorkpad } from '../actions/workpad';
import { getElements, getPages, getSelectedPage, getSelectedElement } from '../selectors/workpad';

/**
 * elementToShape
 *
 * converts a `kibana-canvas` element to an `aeroelastic` shape.
 *
 * Shape: the layout algorithms need to deal with objects through their geometric properties, excluding other aspects,
 * such as what's inside the element, eg. image or scatter plot. This representation is, at its core, a transform matrix
 * that establishes a new local coordinate system https://drafts.csswg.org/css-transforms/#local-coordinate-system plus a
 * size descriptor. There are two versions of the transform matrix:
 *   - `transformMatrix` is analogous to the SVG https://drafts.csswg.org/css-transforms/#current-transformation-matrix
 *   - `localTransformMatrix` is analogous to the SVG https://drafts.csswg.org/css-transforms/#transformation-matrix
 *
 * Element: it also needs to represent the geometry, primarily because of the need to persist it in `redux` and on the
 * server, and to accept such data from the server. The redux and server representations will need to change as more general
 * projections such as 3D are added. The element also needs to maintain its content, such as an image or a plot.
 *
 * While all elements on the current page also exist as shapes, there are shapes that are not elements: annotations.
 * For example, `rotation_handle`, `border_resize_handle` and `border_connection` are modeled as shapes by the layout
 * library, simply for generality.
 */
const elementToShape = (element, i) => {
  const position = element.position;
  const a = position.width / 2;
  const b = position.height / 2;
  const cx = position.left + a;
  const cy = position.top + b;
  const z = i; // painter's algo: latest item goes to top
  // multiplying the angle with -1 as `transform: matrix3d` uses a left-handed coordinate system
  const angleRadians = (-position.angle / 180) * Math.PI;
  const transformMatrix = aero.matrix.multiply(
    aero.matrix.translate(cx, cy, z),
    aero.matrix.rotateZ(angleRadians)
  );
  return {
    id: element.id,
    parent: null, // reserved for hierarchical (tree shaped) grouping,
    localTransformMatrix: transformMatrix,
    transformMatrix,
    a, // we currently specify half-width, half-height as it leads to
    b, // more regular math (like ellipsis radii rather than diameters)
  };
};

const updateGlobalPositions = (setPosition, { shapes, gestureEnd }, elems) => {
  shapes.forEach((shape, i) => {
    const elemPos = elems[i] && elems[i].position;
    if (elemPos && gestureEnd) {
      // get existing position information from element
      const oldProps = {
        left: elemPos.left,
        top: elemPos.top,
        width: elemPos.width,
        height: elemPos.height,
        angle: Math.round(elemPos.angle),
      };

      // cast shape into element-like object to compare
      const newProps = {
        left: shape.transformMatrix[12] - shape.a,
        top: shape.transformMatrix[13] - shape.b,
        width: shape.a * 2,
        height: shape.b * 2,
        angle: Math.round(matrixToAngle(shape.transformMatrix)),
      };

      if (1 / newProps.angle === -Infinity) newProps.angle = 0; // recompose.shallowEqual discerns between 0 and -0

      if (!shallowEqual(oldProps, newProps)) setPosition(shape.id, newProps);
    }
  });
};

const id = element => element.id;

export const aeroelastic = ({ dispatch, getState }) => {
  // When aeroelastic updates an element, we need to dispatch actions to notify redux of the changes
  // dispatch(setPosition({ ... }));

  const onChangeCallback = ({ state }) => {
    const nextScene = state.currentScene;
    if (!nextScene.gestureEnd) return; // only update redux on gesture end
    // TODO: check for gestureEnd on element selection

    // read current data out of redux
    const page = getSelectedPage(getState());
    const elements = getElements(getState(), page);
    const selectedElement = getSelectedElement(getState());

    updateGlobalPositions(
      (elementId, position) => dispatch(setPosition(elementId, page, position)),
      nextScene,
      elements
    );

    // set the selected element on the global store, if one element is selected
    const selectedShape = nextScene.selectedPrimaryShapes[0];
    if (nextScene.selectedShapes.length === 1) {
      if (selectedShape && selectedShape !== selectedElement)
        dispatch(selectElement(selectedShape));
    } else {
      // otherwise, clear the selected element state
      dispatch(selectElement(null));
    }
  };

  const createStore = page =>
    aero.createStore(
      { shapeAdditions: [], primaryUpdate: null, currentScene: { shapes: [] } },
      onChangeCallback,
      page
    );

  const populateWithElements = page =>
    aero.commit(
      page,
      'restateShapesEvent',
      { newShapes: getElements(getState(), page).map(elementToShape) },
      { silent: true }
    );

  const selectShape = (page, id) => {
    aero.commit(page, 'shapeSelect', { shapes: [id] });
  };

  const unselectShape = page => {
    aero.commit(page, 'shapeSelect', { shapes: [] });
  };

  return next => action => {
    // get information before the state is changed
    const prevPage = getSelectedPage(getState());
    const prevElements = getElements(getState(), prevPage);

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
      if (getPages(preRemoveState).length <= 1) lastPageRemoved = true;

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
        if (action.type === duplicatePage.toString()) dispatch(fetchAllRenderables());

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
        if (action.payload) selectShape(prevPage, action.payload);
        else unselectShape(prevPage);

        break;

      case removeElements.toString():
      case addElement.toString():
      case duplicateElement.toString():
      case elementLayer.toString():
      case setPosition.toString():
        const page = getSelectedPage(getState());
        const elements = getElements(getState(), page);

        // TODO: add a better check for elements changing, including their position, ids, etc.
        const shouldResetState =
          prevPage !== page || !shallowEqual(prevElements.map(id), elements.map(id));
        if (shouldResetState) populateWithElements(page);

        if (action.type !== setPosition.toString()) unselectShape(prevPage);

        break;
    }
  };
};

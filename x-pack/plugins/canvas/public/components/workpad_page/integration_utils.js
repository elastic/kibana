/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowEqual } from 'recompose';
import { getNodes, getSelectedPage } from '../../state/selectors/workpad';
import { addElement, removeElements, setMultiplePositions } from '../../state/actions/elements';
import { selectToplevelNodes } from '../../state/actions/transient';
import { arrayToMap, flatten, identity } from '../../lib/aeroelastic/functional';
import { getLocalTransformMatrix } from '../../lib/aeroelastic/layout_functions';
import { matrixToAngle } from '../../lib/aeroelastic/matrix';
import { isGroupId, elementToShape } from './utils';
export * from './utils';

const shapeToElement = (shape) => ({
  left: shape.transformMatrix[12] - shape.a,
  top: shape.transformMatrix[13] - shape.b,
  width: shape.a * 2,
  height: shape.b * 2,
  angle: Math.round((matrixToAngle(shape.transformMatrix) * 180) / Math.PI),
  parent: shape.parent || null,
  type: shape.type === 'group' ? 'group' : 'element',
});

const globalPositionUpdates = (setMultiplePositions, { shapes, gestureEnd }, unsortedElements) => {
  const ascending = (a, b) => (a.id < b.id ? -1 : 1);
  const relevant = (s) => s.type !== 'annotation' && s.subtype !== 'adHocGroup';
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
  return repositionings;
};

const dedupe = (d, i, a) => a.findIndex((s) => s.id === d.id) === i;

const missingParentCheck = (groups) => {
  const idMap = arrayToMap(groups.map((g) => g.id));
  groups.forEach((g) => {
    if (g.parent && !idMap[g.parent]) {
      g.parent = null;
    }
  });
};

export const shapesForNodes = (nodes) => {
  const rawShapes = nodes
    .map(elementToShape)
    // filtering to eliminate residual element of a possible group that had been deleted in Redux
    .filter((d, i, a) => !isGroupId(d.id) || a.find((s) => s.parent === d.id))
    .filter(dedupe);
  missingParentCheck(rawShapes);
  const getLocalMatrix = getLocalTransformMatrix(rawShapes);
  return rawShapes.map((s) => ({ ...s, localTransformMatrix: getLocalMatrix(s) }));
};

const updateGlobalPositionsInRedux = (setMultiplePositions, scene, unsortedElements) => {
  const repositionings = globalPositionUpdates(setMultiplePositions, scene, unsortedElements);
  if (repositionings.length) {
    setMultiplePositions(repositionings);
  }
};

export const globalStateUpdater = (dispatch, globalState) => (state) => {
  const nextScene = state.currentScene;
  const page = getSelectedPage(globalState);
  const elements = getNodes(globalState, page);
  const shapes = nextScene.shapes;
  const persistableGroups = shapes.filter((s) => s.subtype === 'persistentGroup').filter(dedupe);
  const persistedGroups = elements.filter((e) => isGroupId(e.id)).filter(dedupe);

  persistableGroups.forEach((g) => {
    if (
      !persistedGroups.find((p) => {
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
    (p) =>
      !persistableGroups.find((g) => p.id === g.id) ||
      !elements.find((e) => e.position.parent === p.id)
  );

  updateGlobalPositionsInRedux(
    (positions) => dispatch(setMultiplePositions(positions.map((p) => ({ ...p, pageId: page })))),
    nextScene,
    elements
  );

  if (elementsToRemove.length) {
    // remove elements for groups that were ungrouped
    dispatch(
      removeElements(
        elementsToRemove.map((e) => e.id),
        page
      )
    );
  }

  // set the selected element on the global store, if one element is selected
  const selectedPrimaryShapes = nextScene.selectedPrimaryShapes;
  if (!shallowEqual(selectedPrimaryShapes, globalState.transient.selectedToplevelNodes)) {
    dispatch(
      selectToplevelNodes(
        flatten(
          selectedPrimaryShapes.map((n) =>
            n.startsWith('group') && (shapes.find((s) => s.id === n) || {}).subtype === 'adHocGroup'
              ? shapes.filter((s) => s.type !== 'annotation' && s.parent === n).map((s) => s.id)
              : [n]
          )
        )
      )
    );
  }
};

export const crawlTree = (shapes) => (shapeId) => {
  const rec = (shapeId) => [
    shapeId,
    ...flatten(shapes.filter((s) => s.position.parent === shapeId).map((s) => rec(s.id))),
  ];
  return rec(shapeId);
};

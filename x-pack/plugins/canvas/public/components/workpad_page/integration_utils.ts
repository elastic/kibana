/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowEqual } from 'recompose';
import { Dispatch } from 'redux';
import { getNodes, getSelectedPage } from '../../state/selectors/workpad';
import {
  addElement,
  removeElements,
  setMultiplePositions as setMultiplePositionsAction,
  // @ts-expect-error
} from '../../state/actions/elements';
// @ts-expect-error
import { selectToplevelNodes } from '../../state/actions/transient';
// @ts-expect-error
import { arrayToMap, flatten, identity } from '../../lib/aeroelastic/functional';
// @ts-expect-error
import { getLocalTransformMatrix } from '../../lib/aeroelastic/layout_functions';
import { matrixToAngle } from '../../lib/aeroelastic/matrix';
import { Shape } from '../../lib/aeroelastic';
import { isGroupId, elementToShape } from './positioning_utils';
export * from './positioning_utils';
import { State, AeroState, CanvasNode, CanvasNodePosition } from '../../../types';

const shapeToElement = (shape: Shape): CanvasNodePosition => ({
  left: shape.transformMatrix[12] - shape.a,
  top: shape.transformMatrix[13] - shape.b,
  width: shape.a * 2,
  height: shape.b * 2,
  angle: Math.round((matrixToAngle(shape.transformMatrix) * 180) / Math.PI),
  parent: shape.parent || null,
  type: shape.type === 'group' ? 'group' : 'element',
});

interface PositionUpdate {
  elementId: string;
  position: CanvasNodePosition;
}

type SetMultiplePositionsFn = (positions: PositionUpdate[]) => void;

const globalPositionUpdates = (
  setMultiplePositions: SetMultiplePositionsFn,
  { shapes, gestureEnd }: AeroState['currentScene'],
  unsortedElements: CanvasNode[]
): PositionUpdate[] => {
  const ascending = (a: Shape | CanvasNode, b: Shape | CanvasNode) => (a.id < b.id ? -1 : 1);
  const relevant = (s: Shape) => s.type !== 'annotation' && s.subtype !== 'adHocGroup';
  const elements = unsortedElements.sort(ascending);
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
    .filter(identity)
    .filter<PositionUpdate>(
      (reposition): reposition is PositionUpdate => reposition !== null && reposition !== undefined
    );
  return repositionings;
};

const dedupe = <T extends { id: string }>(d: T, i: number, a: T[]) =>
  a.findIndex((s) => s.id === d.id) === i;

const missingParentCheck = (groups: Shape[]) => {
  const idMap = arrayToMap(groups.map((g) => g.id));
  groups.forEach((g) => {
    if (g.parent && !idMap[g.parent]) {
      g.parent = null;
    }
  });
};

export const shapesForNodes = (nodes: CanvasNode[]) => {
  const rawShapes = nodes
    .map(elementToShape)
    // filtering to eliminate residual element of a possible group that had been deleted in Redux
    .filter((d, i, a) => !isGroupId(d.id) || a.find((s) => s.parent === d.id))
    .filter(dedupe);
  missingParentCheck(rawShapes);
  const getLocalMatrix = getLocalTransformMatrix(rawShapes);
  return rawShapes.map((s) => ({ ...s, localTransformMatrix: getLocalMatrix(s) }));
};

const updateGlobalPositionsInRedux = (
  setMultiplePositions: SetMultiplePositionsFn,
  scene: AeroState['currentScene'],
  unsortedElements: CanvasNode[]
) => {
  const repositionings = globalPositionUpdates(setMultiplePositions, scene, unsortedElements);
  if (repositionings.length) {
    setMultiplePositions(repositionings);
  }
};

export const globalStateUpdater =
  (dispatch: Dispatch, globalState: State) => (state: AeroState) => {
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
      (positions: PositionUpdate[]) =>
        dispatch(setMultiplePositionsAction(positions.map((p) => ({ ...p, pageId: page })))),
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
              n.startsWith('group') &&
              (shapes.find((s) => s.id === n) || { subtype: 'nothing' }).subtype === 'adHocGroup'
                ? shapes.filter((s) => s.type !== 'annotation' && s.parent === n).map((s) => s.id)
                : [n]
            )
          )
        )
      );
    }
  };

export const crawlTree = (shapes: CanvasNode[]) => (shapeId: string) => {
  const rec = (thisShapeId: string): string[] => [
    thisShapeId,
    ...shapes
      .filter((s) => s.position.parent === thisShapeId)
      .map((s) => rec(s.id))
      .flat(),
  ];

  return rec(shapeId);
};

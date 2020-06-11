/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rbush from 'rbush';
import { createSelector } from 'reselect';
import * as cameraSelectors from './camera/selectors';
import * as dataSelectors from './data/selectors';
import * as uiSelectors from './ui/selectors';
import {
  ResolverState,
  Vector2,
  IndexedEntity,
  IndexedEdgeLineSegment,
  IndexedProcessNode,
} from '../types';
import { applyMatrix3 } from '../lib/vector2';
import { factory as indexedProcessTreeFactory } from '../models/indexed_process_tree';

/**
 * A matrix that when applied to a Vector2 will convert it from world coordinates to screen coordinates.
 * See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const projectionMatrix = composeSelectors(
  cameraStateSelector,
  cameraSelectors.projectionMatrix
);

export const clippingPlanes = composeSelectors(cameraStateSelector, cameraSelectors.clippingPlanes);
export const translation = composeSelectors(cameraStateSelector, cameraSelectors.translation);

/**
 * A matrix that when applied to a Vector2 converts it from screen coordinates to world coordinates.
 * See https://en.wikipedia.org/wiki/Orthographic_projection
 */
export const inverseProjectionMatrix = composeSelectors(
  cameraStateSelector,
  cameraSelectors.inverseProjectionMatrix
);

/**
 * The scale by which world values are scaled when rendered.
 */
export const scale = composeSelectors(cameraStateSelector, cameraSelectors.scale);

/**
 * Scales the coordinate system, used for zooming. Should always be between 0 and 1
 */
export const scalingFactor = composeSelectors(cameraStateSelector, cameraSelectors.scalingFactor);

/**
 * Whether or not the user is current panning the map.
 */
export const userIsPanning = composeSelectors(cameraStateSelector, cameraSelectors.userIsPanning);

/**
 * Whether or not the camera is animating, at a given time.
 */
export const isAnimating = composeSelectors(cameraStateSelector, cameraSelectors.isAnimating);

export const processNodePositionsAndEdgeLineSegments = composeSelectors(
  dataStateSelector,
  dataSelectors.processNodePositionsAndEdgeLineSegments
);

export const processAdjacencies = composeSelectors(
  dataStateSelector,
  dataSelectors.processAdjacencies
);

export const terminatedProcesses = composeSelectors(
  dataStateSelector,
  dataSelectors.terminatedProcesses
);

/**
 * Returns the id of the "current" tree node (fake-focused)
 */
export const uiActiveDescendantId = composeSelectors(
  uiStateSelector,
  uiSelectors.activeDescendantId
);

/**
 * Returns the id of the "selected" tree node (the node that is currently "pressed" and possibly controlling other popups / components)
 */
export const uiSelectedDescendantId = composeSelectors(
  uiStateSelector,
  uiSelectors.selectedDescendantId
);

/**
 * Returns the camera state from within ResolverState
 */
function cameraStateSelector(state: ResolverState) {
  return state.camera;
}

/**
 * Returns the data state from within ResolverState
 */
function dataStateSelector(state: ResolverState) {
  return state.data;
}

/**
 * Returns the ui state from within ResolverState
 */
function uiStateSelector(state: ResolverState) {
  return state.ui;
}

/**
 * Whether or not the resolver is pending fetching data
 */
export const isLoading = composeSelectors(dataStateSelector, dataSelectors.isLoading);

/**
 * Whether or not the resolver encountered an error while fetching data
 */
export const hasError = composeSelectors(dataStateSelector, dataSelectors.hasError);

/**
 * Calls the `secondSelector` with the result of the `selector`. Use this when re-exporting a
 * concern-specific selector. `selector` should return the concern-specific state.
 */
function composeSelectors<OuterState, InnerState, ReturnValue>(
  selector: (state: OuterState) => InnerState,
  secondSelector: (state: InnerState) => ReturnValue
): (state: OuterState) => ReturnValue {
  return (state) => secondSelector(selector(state));
}

const spatiallyIndexedEntities = createSelector(
  (state: ResolverState) => state,
  function (state) {
    const indexedProcessTree = indexedProcessTreeFactory(
      dataSelectors.graphableProcesses(state.data)
    );
    const processNodeViewWidth = 360;
    const processNodeViewHeight = 120;
    const widths = dataSelectors.widthsOfProcessSubtrees(indexedProcessTree);

    const positions = dataSelectors.processPositions(indexedProcessTree, widths);

    const edgeLineSegments = dataSelectors.processEdgeLineSegments(
      indexedProcessTree,
      widths,
      positions
    );

    const tree: rbush<IndexedEntity> = new rbush();
    const processesToIndex: IndexedProcessNode[] = [];
    const edgeLineSegmentsToIndex: IndexedEdgeLineSegment[] = [];
    for (const [processEvent, position] of positions) {
      const transformedPosition = applyMatrix3(position, dataSelectors.isometricTransformMatrix);
      const [nodeX, nodeY] = transformedPosition;
      const indexedEvent: IndexedProcessNode = {
        minX: nodeX - 0.5 * processNodeViewWidth,
        minY: nodeY - 0.5 * processNodeViewHeight,
        maxX: nodeX + 0.5 * processNodeViewWidth,
        maxY: nodeY + 0.5 * processNodeViewHeight,
        position: transformedPosition,
        entity: processEvent,
        type: 'processNode',
      };
      processesToIndex.push(indexedEvent);
    }
    for (const edgeLineSegment of edgeLineSegments) {
      const transformedSegment: Vector2[] = [];
      for (const point of edgeLineSegment) {
        transformedSegment.push(applyMatrix3(point, dataSelectors.isometricTransformMatrix));
      }
      const [[x1, y1], [x2, y2]] = transformedSegment;
      const indexedLineSegment: IndexedEdgeLineSegment = {
        minX: Math.min(x1, x2),
        minY: Math.min(y1, y2),
        maxX: Math.max(x1, x2),
        maxY: Math.max(y1, y2),
        entity: transformedSegment,
        type: 'edgeLine',
      };
      edgeLineSegmentsToIndex.push(indexedLineSegment);
    }
    tree.load([...processesToIndex, ...edgeLineSegmentsToIndex]);
    return tree;
  }
);

const boundingBox = composeSelectors(cameraStateSelector, cameraSelectors.viewableBoundingBox);

const currentBoundingBox = createSelector(
  (state: ResolverState) => state,
  function (state) {
    return boundingBox(state)(Date.now());
  }
);

export const visibleProcessNodePositionsAndEdgeLineSegments = createSelector(
  spatiallyIndexedEntities,
  currentBoundingBox,
  function visibleProcessNodePositionsAndEdgeLineSegments(tree, { maximum, minimum }) {
    const [minX, minY] = minimum;
    const [maxX, maxY] = maximum;
    const visibleEntities = tree.search({
      minX,
      minY,
      maxX,
      maxY,
    });
    const visibleProcessNodePositions = visibleEntities.filter(
      (entity): entity is IndexedProcessNode => entity.type === 'processNode'
    );
    const visibleEdgeLineSegments = visibleEntities.filter(
      (entity): entity is IndexedEdgeLineSegment => entity.type === 'edgeLine'
    );
    return {
      visibleProcessNodePositions,
      visibleEdgeLineSegments,
    };
  }
);

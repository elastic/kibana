/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import * as cameraSelectors from './camera/selectors';
import * as dataSelectors from './data/selectors';
import * as uiSelectors from './ui/selectors';
import { ResolverState } from '../types';

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

/**
 * If we need to fetch, this is the entity ID to fetch.
 */
export const databaseDocumentIDToFetch = composeSelectors(
  dataStateSelector,
  dataSelectors.databaseDocumentIDToFetch
);

export const databaseDocumentIDToAbort = composeSelectors(
  dataStateSelector,
  dataSelectors.databaseDocumentIDToAbort
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
 * Returns a map of `ResolverEvent` entity_id to their related event and alert statistics
 */
export const relatedEventsStats = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventsStats
);

/**
 * Map of related events... by entity id
 */
export const relatedEventsByEntityId = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventsByEntityId
);

/**
 * Entity ids to booleans for waiting status
 */
export const relatedEventsReady = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventsReady
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
 * Returns the entity_id of the "selected" tree node's process
 */
export const uiSelectedDescendantProcessId = composeSelectors(
  uiStateSelector,
  uiSelectors.selectedDescendantProcessId
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
 * An array containing all the processes currently in the Resolver than can be graphed
 */
export const graphableProcesses = composeSelectors(
  dataStateSelector,
  dataSelectors.graphableProcesses
);

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

const boundingBox = composeSelectors(cameraStateSelector, cameraSelectors.viewableBoundingBox);
const indexedProcessNodesAndEdgeLineSegments = composeSelectors(
  dataStateSelector,
  dataSelectors.visibleProcessNodePositionsAndEdgeLineSegments
);

/**
 * Total count of related events for a process.
 */
export const relatedEventTotalForProcess = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventTotalForProcess
);

/**
 * Return the visible edge lines and process nodes based on the camera position at `time`.
 * The bounding box represents what the camera can see. The camera position is a function of time because it can be
 * animated. So in order to get the currently visible entities, we need to pass in time.
 */
export const visibleProcessNodePositionsAndEdgeLineSegments = createSelector(
  indexedProcessNodesAndEdgeLineSegments,
  boundingBox,
  function (
    /* eslint-disable no-shadow */
    indexedProcessNodesAndEdgeLineSegments,
    boundingBox
    /* eslint-enable no-shadow */
  ) {
    return (time: number) => indexedProcessNodesAndEdgeLineSegments(boundingBox(time));
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector, defaultMemoize } from 'reselect';
import * as cameraSelectors from './camera/selectors';
import * as dataSelectors from './data/selectors';
import * as uiSelectors from './ui/selectors';
import { ResolverState, IsometricTaxiLayout } from '../types';
import { uniquePidForProcess } from '../models/process_event';
import { ResolverEvent } from '../../../common/endpoint/types';

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

/**
 * Given a nodeID (aka entity_id) get the indexed process event.
 * Legacy functions take process events instead of nodeID, use this to get
 * process events for them.
 */
export const processEventForID: (
  state: ResolverState
) => (nodeID: string) => ResolverEvent | null = composeSelectors(
  dataStateSelector,
  dataSelectors.processEventForID
);

/**
 * The position of nodes and edges.
 */
export const layout: (state: ResolverState) => IsometricTaxiLayout = composeSelectors(
  dataStateSelector,
  dataSelectors.layout
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

export const resolverComponentInstanceID = composeSelectors(
  dataStateSelector,
  dataSelectors.resolverComponentInstanceID
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
 * Returns a function that returns a function (when supplied with an entity id for a node)
 * that returns related events for a node that match an event.category (when supplied with the category)
 */
export const relatedEventsByCategory = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventsByCategory
);

/**
 * Entity ids to booleans for waiting status
 */
export const relatedEventsReady = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventsReady
);

/**
 * Business logic lookup functions by ECS category by entity id.
 * Example usage:
 * const numberOfFileEvents = infoByEntityId.get(`someEntityId`)?.getAggregateTotalForCategory(`file`);
 */
export const relatedEventInfoByEntityId = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventInfoByEntityId
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
 * True if the children cursor is not null
 */
export const hasMoreChildren = composeSelectors(dataStateSelector, dataSelectors.hasMoreChildren);

/**
 * True if the ancestor cursor is not null
 */
export const hasMoreAncestors = composeSelectors(dataStateSelector, dataSelectors.hasMoreAncestors);

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

const nodesAndEdgelines = composeSelectors(dataStateSelector, dataSelectors.nodesAndEdgelines);

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
export const visibleNodesAndEdgeLines = createSelector(nodesAndEdgelines, boundingBox, function (
  /* eslint-disable no-shadow */
  nodesAndEdgelines,
  boundingBox
  /* eslint-enable no-shadow */
) {
  return (time: number) => nodesAndEdgelines(boundingBox(time));
});

/**
 * Takes a nodeID (aka entity_id) and returns the associated aria level as a number or null if the node ID isn't in the tree.
 */
export const ariaLevel: (
  state: ResolverState
) => (nodeID: string) => number | null = composeSelectors(
  dataStateSelector,
  dataSelectors.ariaLevel
);

/**
 * Takes a nodeID (aka entity_id) and returns the node ID of the node that aria should 'flowto' or null
 * If the node has a following sibling that is currently visible, that will be returned, otherwise null.
 */
export const ariaFlowtoNodeID: (
  state: ResolverState
) => (time: number) => (nodeID: string) => string | null = createSelector(
  visibleNodesAndEdgeLines,
  composeSelectors(dataStateSelector, dataSelectors.followingSibling),
  (visibleNodesAndEdgeLinesAtTime, followingSibling) => {
    return defaultMemoize((time: number) => {
      // get the visible nodes at `time`
      const { processNodePositions } = visibleNodesAndEdgeLinesAtTime(time);

      // get a `Set` containing their node IDs
      const nodesVisibleAtTime: Set<string> = new Set(
        [...processNodePositions.keys()].map(uniquePidForProcess)
      );

      // return the ID of `nodeID`'s following sibling, if it is visible
      return (nodeID: string): string | null => {
        const sibling: string | null = followingSibling(nodeID);

        return sibling === null || nodesVisibleAtTime.has(sibling) === false ? null : sibling;
      };
    });
  }
);

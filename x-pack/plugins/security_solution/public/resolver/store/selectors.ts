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
import { EventStats, ResolverNode } from '../../../common/endpoint/types';
import * as nodeModel from '../../../common/endpoint/models/node';

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
 * The position of nodes and edges.
 */
export const layout: (state: ResolverState) => IsometricTaxiLayout = composeSelectors(
  dataStateSelector,
  dataSelectors.layout
);

/**
 * If we need to fetch, this is the entity ID to fetch.
 */
export const treeParametersToFetch = composeSelectors(
  dataStateSelector,
  dataSelectors.treeParametersToFetch
);

export const treeRequestParametersToAbort = composeSelectors(
  dataStateSelector,
  dataSelectors.treeRequestParametersToAbort
);

export const resolverComponentInstanceID = composeSelectors(
  dataStateSelector,
  dataSelectors.resolverComponentInstanceID
);

/**
 * This returns a map of nodeIds to the associated stats provided by the datasource.
 */
export const nodeStats: (
  state: ResolverState
) => (nodeID: string) => EventStats | undefined = composeSelectors(
  dataStateSelector,
  dataSelectors.nodeStats
);

/**
 * This returns the "aggregate total" for related events, tallied as the sum
 * of their individual `event.category`s. E.g. a [DNS, Network] would count as two
 * towards the aggregate total.
 */
export const relatedEventTotalCount: (
  state: ResolverState
) => (nodeID: string) => number | undefined = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventTotalCount
);

export const relatedEventCountByCategory: (
  state: ResolverState
) => (nodeID: string, eventCategory: string) => number | undefined = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventCountByCategory
);

/**
 * the loading state of the current related event data for the `event_detail` view
 */
export const isCurrentRelatedEventLoading = composeSelectors(
  dataStateSelector,
  dataSelectors.isCurrentRelatedEventLoading
);

/**
 * the current related event data for the `event_detail` view
 */
export const currentRelatedEventData = composeSelectors(
  dataStateSelector,
  dataSelectors.currentRelatedEventData
);

/**
 * Returns the id of the "current" tree node (fake-focused)
 */
export const ariaActiveDescendant = composeSelectors(
  uiStateSelector,
  uiSelectors.ariaActiveDescendant
);

/**
 * Returns the nodeID of the selected node
 */
export const selectedNode = composeSelectors(uiStateSelector, uiSelectors.selectedNode);

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
export const isTreeLoading = composeSelectors(dataStateSelector, dataSelectors.isTreeLoading);

/**
 * Whether or not the resolver encountered an error while fetching data
 */
export const hadErrorLoadingTree = composeSelectors(
  dataStateSelector,
  dataSelectors.hadErrorLoadingTree
);

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
export const graphableNodes = composeSelectors(dataStateSelector, dataSelectors.graphableNodes);

const boundingBox = composeSelectors(cameraStateSelector, cameraSelectors.viewableBoundingBox);

const nodesAndEdgelines = composeSelectors(dataStateSelector, dataSelectors.nodesAndEdgelines);

/**
 * Total count of related events for a process.
 * @deprecated
 */
export const statsTotalForNode = composeSelectors(
  dataStateSelector,
  dataSelectors.statsTotalForNode
);

/**
 * Return the visible edge lines and process nodes based on the camera position at `time`.
 * The bounding box represents what the camera can see. The camera position is a function of time because it can be
 * animated. So in order to get the currently visible entities, we need to pass in time.
 */
export const visibleNodesAndEdgeLines = createSelector(nodesAndEdgelines, boundingBox, function (
  /* eslint-disable @typescript-eslint/no-shadow */
  nodesAndEdgelines,
  boundingBox
  /* eslint-enable @typescript-eslint/no-shadow */
) {
  // `boundingBox` and `nodesAndEdgelines` are each memoized.
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
 * the node ID of the node representing the databaseDocumentID
 */
export const originID: (state: ResolverState) => string | undefined = composeSelectors(
  dataStateSelector,
  dataSelectors.originID
);

/**
 * Takes a nodeID (aka entity_id) and returns the node ID of the node that aria should 'flowto' or null
 * If the node has a flowto candidate that is currently visible, that will be returned, otherwise null.
 */
export const ariaFlowtoNodeID: (
  state: ResolverState
) => (time: number) => (nodeID: string) => string | null = createSelector(
  visibleNodesAndEdgeLines,
  composeSelectors(dataStateSelector, dataSelectors.ariaFlowtoCandidate),
  (visibleNodesAndEdgeLinesAtTime, ariaFlowtoCandidate) => {
    return defaultMemoize((time: number) => {
      // get the visible nodes at `time`
      const { processNodePositions } = visibleNodesAndEdgeLinesAtTime(time);

      // get a `Set` containing their node IDs
      const nodesVisibleAtTime: Set<string> = new Set();
      // NB: in practice, any event that has been graphed is guaranteed to have an entity_id
      for (const visibleNode of processNodePositions.keys()) {
        const nodeID = nodeModel.nodeID(visibleNode);
        if (nodeID !== undefined) {
          nodesVisibleAtTime.add(nodeID);
        }
      }

      // return the ID of `nodeID`'s following sibling, if it is visible
      return (nodeID: string): string | null => {
        const flowtoNode: string | null = ariaFlowtoCandidate(nodeID);

        return flowtoNode === null || nodesVisibleAtTime.has(flowtoNode) === false
          ? null
          : flowtoNode;
      };
    });
  }
);

export const panelViewAndParameters = composeSelectors(
  uiStateSelector,
  uiSelectors.panelViewAndParameters
);

export const relativeHref = composeSelectors(uiStateSelector, uiSelectors.relativeHref);

/**
 * @deprecated use `useLinkProps`
 */
export const relatedEventsRelativeHrefs = composeSelectors(
  uiStateSelector,
  uiSelectors.relatedEventsRelativeHrefs
);

/**
 * Total count of events related to `nodeID`.
 * Based on `ResolverNodeStats`
 */
export const totalRelatedEventCountForNode = composeSelectors(
  dataStateSelector,
  dataSelectors.totalRelatedEventCountForNode
);

/**
 * Count of events with `category` related to `nodeID`.
 * Based on `ResolverNodeStats`
 * Used to populate the breadcrumbs in the `nodeEventsInCategory` panel.
 */
export const relatedEventCountOfTypeForNode = composeSelectors(
  dataStateSelector,
  dataSelectors.relatedEventCountOfTypeForNode
);

/**
 * Events related to the panel node that are in the panel category.
 * Used to populate the breadcrumbs in the `nodeEventsInCategory` panel.
 * NB: This cannot tell the view loading information. For example, this does not tell the view if data has been request or if data failed to load.
 */
export const nodeEventsInCategory = composeSelectors(
  dataStateSelector,
  dataSelectors.nodeEventsInCategory
);

/**
 * Flag used to show a Load More Data button in the nodeEventsOfType panel view.
 */
export const lastRelatedEventResponseContainsCursor = composeSelectors(
  dataStateSelector,
  dataSelectors.lastRelatedEventResponseContainsCursor
);

/**
 * Flag to show an error message when loading more related events.
 */
export const hadErrorLoadingNodeEventsInCategory = composeSelectors(
  dataStateSelector,
  dataSelectors.hadErrorLoadingNodeEventsInCategory
);
/**
 * Flag used to show a loading view for the initial loading of related events.
 */
export const isLoadingNodeEventsInCategory = composeSelectors(
  dataStateSelector,
  dataSelectors.isLoadingNodeEventsInCategory
);

/**
 * Flag used to show a loading state for any additional related events.
 */
export const isLoadingMoreNodeEventsInCategory = composeSelectors(
  dataStateSelector,
  dataSelectors.isLoadingMoreNodeEventsInCategory
);

/**
 * Returns the state of the node, loading, running, or terminated.
 */
export const getNodeState = composeSelectors(dataStateSelector, dataSelectors.getNodeState);

/**
 * Returns the node data object for a specific node ID.
 */
export const nodeDataForID = composeSelectors(dataStateSelector, dataSelectors.nodeDataForID);

/**
 * Returns the graph node for a given ID
 */
export const graphNodeForID = composeSelectors(dataStateSelector, dataSelectors.graphNodeForID);

/**
 * Returns a Set of node IDs representing the visible nodes in the view.
 */
export const visibleNodes: (state: ResolverState) => (time: number) => Set<string> = createSelector(
  visibleNodesAndEdgeLines,
  function (visibleNodesAndEdgeLinesAtTime) {
    return defaultMemoize((time: number) => {
      const { processNodePositions } = visibleNodesAndEdgeLinesAtTime(time);

      const nodes: Set<string> = new Set();
      for (const node of processNodePositions.keys()) {
        const id = nodeModel.nodeID(node);
        if (id !== undefined) {
          nodes.add(id);
        }
      }
      return nodes;
    });
  }
);

/**
 * Returns the full node data structure.
 */
export const nodeData = composeSelectors(dataStateSelector, dataSelectors.nodeData);

export const isNodeDataLoading = composeSelectors(
  dataStateSelector,
  dataSelectors.isNodeDataLoading
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

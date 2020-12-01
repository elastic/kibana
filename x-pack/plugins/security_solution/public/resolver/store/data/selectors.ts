/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rbush from 'rbush';
import { createSelector, defaultMemoize } from 'reselect';
import { panelViewAndParameters as panelViewAndParametersFromLocationSearchAndResolverComponentInstanceID } from '../panel_view_and_parameters';
import {
  DataState,
  Vector2,
  IndexedEntity,
  IndexedEdgeLineSegment,
  IndexedProcessNode,
  AABB,
  VisibleEntites,
  TreeFetcherParameters,
  IsometricTaxiLayout,
} from '../../types';
import { isGraphableProcess, isTerminatedProcess } from '../../models/process_event';
import * as indexedProcessTreeModel from '../../models/indexed_process_tree';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as nodeEventsInCategoryModel from './node_events_in_category_model';
import {
  ResolverTree,
  ResolverNodeStats,
  SafeResolverEvent,
} from '../../../../common/endpoint/types';
import * as resolverTreeModel from '../../models/resolver_tree';
import * as treeFetcherParametersModel from '../../models/tree_fetcher_parameters';
import * as isometricTaxiLayoutModel from '../../models/indexed_process_tree/isometric_taxi_layout';
import * as vector2 from '../../models/vector2';

/**
 * If there is currently a request.
 */
export function isTreeLoading(state: DataState): boolean {
  return state.tree?.pendingRequestParameters !== undefined;
}

/**
 * If a request was made and it threw an error or returned a failure response code.
 */
export function hadErrorLoadingTree(state: DataState): boolean {
  if (state.tree?.lastResponse) {
    return !state.tree?.lastResponse.successful;
  }
  return false;
}

/**
 * A string for uniquely identifying the instance of resolver within the app.
 */
export function resolverComponentInstanceID(state: DataState): string {
  return state.resolverComponentInstanceID ? state.resolverComponentInstanceID : '';
}

/**
 * The last ResolverTree we received, if any. It may be stale (it might not be for the same databaseDocumentID that
 * we're currently interested in.
 */
const resolverTreeResponse = (state: DataState): ResolverTree | undefined => {
  return state.tree?.lastResponse?.successful ? state.tree?.lastResponse.result : undefined;
};

export function currentRelatedEventRequestID(state: DataState): number | undefined {
  if (state.currentRelatedEvent?.data) {
    return state.currentRelatedEvent?.data.dataRequestID;
  } else {
    return undefined;
  }
}

export function currentNodeEventsInCategoryRequestID(state: DataState): number | undefined {
  if (state.nodeEventsInCategory?.pendingRequestParameters) {
    return state.nodeEventsInCategory.pendingRequestParameters?.dataRequestID;
  } else if (state.nodeEventsInCategory) {
    return state.nodeEventsInCategory?.dataRequestID;
  } else {
    return undefined;
  }
}

/**
 * the node ID of the node representing the databaseDocumentID.
 * NB: this could be stale if the last response is stale
 */
export const originID: (state: DataState) => string | undefined = createSelector(
  resolverTreeResponse,
  function (resolverTree?) {
    if (resolverTree) {
      // This holds the entityID (aka nodeID) of the node related to the last fetched `_id`
      return resolverTree.entityID;
    }
    return undefined;
  }
);

/**
 * Process events that will be displayed as terminated.
 */
export const terminatedProcesses = createSelector(
  resolverTreeResponse,
  function (tree?: ResolverTree) {
    if (!tree) {
      return new Set();
    }
    return new Set(
      resolverTreeModel
        .lifecycleEvents(tree)
        .filter(isTerminatedProcess)
        .map((terminatedEvent) => {
          return eventModel.entityIDSafeVersion(terminatedEvent);
        })
    );
  }
);

/**
 * A function that given an entity id returns a boolean indicating if the id is in the set of terminated processes.
 */
export const isProcessTerminated = createSelector(terminatedProcesses, function (
  // eslint-disable-next-line @typescript-eslint/no-shadow
  terminatedProcesses
) {
  return (entityID: string) => {
    return terminatedProcesses.has(entityID);
  };
});

/**
 * Process events that will be graphed.
 */
export const graphableProcesses = createSelector(resolverTreeResponse, function (tree?) {
  // Keep track of the last process event (in array order) for each entity ID
  const events: Map<string, SafeResolverEvent> = new Map();
  if (tree) {
    for (const event of resolverTreeModel.lifecycleEvents(tree)) {
      if (isGraphableProcess(event)) {
        const entityID = eventModel.entityIDSafeVersion(event);
        if (entityID !== undefined) {
          events.set(entityID, event);
        }
      }
    }
    return [...events.values()];
  } else {
    return [];
  }
});

/**
 * The 'indexed process tree' contains the tree data, indexed in helpful ways. Used for O(1) access to stuff during graph layout.
 */
export const tree = createSelector(graphableProcesses, function indexedTree(
  // eslint-disable-next-line @typescript-eslint/no-shadow
  graphableProcesses
) {
  return indexedProcessTreeModel.factory(graphableProcesses);
});

/**
 * This returns a map of entity_ids to stats about the related events and alerts.
 * @deprecated
 */
export const relatedEventsStats: (
  state: DataState
) => (nodeID: string) => ResolverNodeStats | undefined = createSelector(
  resolverTreeResponse,
  (resolverTree?: ResolverTree) => {
    if (resolverTree) {
      const map = resolverTreeModel.relatedEventsStats(resolverTree);
      return (nodeID: string) => map.get(nodeID);
    } else {
      return () => undefined;
    }
  }
);

/**
 * The total number of events related to a node.
 */
export const relatedEventTotalCount: (
  state: DataState
) => (entityID: string) => number | undefined = createSelector(
  relatedEventsStats,
  (relatedStats) => {
    return (entityID) => {
      return relatedStats(entityID)?.events?.total;
    };
  }
);

/**
 *
 *
 * @export
 * @param {DataState} state
 * @returns the loading state of the current related event data for the `event_detail` view
 */
export function isCurrentRelatedEventLoading(state: DataState) {
  return state.currentRelatedEvent.loading;
}

export function dataRefreshRequestsMade(state: DataState) {
  return state.dataRefreshRequestsMade;
}

/**
 *
 *
 * @export
 * @param {DataState} state
 * @returns {(SafeResolverEvent | null)} the current related event data for the `event_detail` view
 */
export function currentRelatedEventData(state: DataState): SafeResolverEvent | null {
  return state.currentRelatedEvent.data;
}

/**
 * `true` if there were more children than we got in the last request.
 * @deprecated
 */
export function hasMoreChildren(state: DataState): boolean {
  const resolverTree = resolverTreeResponse(state);
  return resolverTree ? resolverTreeModel.hasMoreChildren(resolverTree) : false;
}

/**
 * `true` if there were more ancestors than we got in the last request.
 * @deprecated
 */
export function hasMoreAncestors(state: DataState): boolean {
  const resolverTree = resolverTreeResponse(state);
  return resolverTree ? resolverTreeModel.hasMoreAncestors(resolverTree) : false;
}

/**
 * If the tree resource needs to be fetched then these are the parameters that should be used.
 */
export function treeParametersToFetch(state: DataState): TreeFetcherParameters | null {
  /**
   * If there are current tree parameters that don't match the parameters used in the pending request (if there is a pending request) and that don't match the parameters used in the last completed request (if there was a last completed request) then we need to fetch the tree resource using the current parameters.
   */
  if (state.tree?.currentParameters !== undefined) {
    if (
      !treeFetcherParametersModel.equal(
        state.tree?.currentParameters,
        state.tree?.lastResponse?.parameters
      ) &&
      !treeFetcherParametersModel.equal(
        state.tree?.currentParameters,
        state.tree?.pendingRequestParameters
      )
    ) {
      return state.tree.currentParameters;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

export function lastResponseParameters(state: DataState): TreeFetcherParameters | null {
  if (state.tree?.lastResponse) {
    return state.tree?.lastResponse?.parameters;
  } else {
    return null;
  }
}

export function currentParameters(state: DataState): TreeFetcherParameters | null {
  if (state.tree?.currentParameters) {
    return state.tree?.currentParameters;
  } else {
    return null;
  }
}

export const layout: (state: DataState) => IsometricTaxiLayout = createSelector(
  tree,
  originID,
  function processNodePositionsAndEdgeLineSegments(
    indexedProcessTree,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    originID
  ) {
    // use the isometric taxi layout as a base
    const taxiLayout = isometricTaxiLayoutModel.isometricTaxiLayoutFactory(indexedProcessTree);

    if (!originID) {
      // no data has loaded.
      return taxiLayout;
    }

    // find the origin node
    const originNode = indexedProcessTreeModel.processEvent(indexedProcessTree, originID);

    if (originNode === null) {
      // If a tree is returned that has no process events for the origin, this can happen.
      return taxiLayout;
    }

    // Find the position of the origin, we'll center the map on it intrinsically
    const originPosition = isometricTaxiLayoutModel.processPosition(taxiLayout, originNode);
    // adjust the position of everything so that the origin node is at `(0, 0)`

    if (originPosition === undefined) {
      // not sure how this could happen.
      return taxiLayout;
    }

    // Take the origin position, and multipy it by -1, then move the layout by that amount.
    // This should center the layout around the origin.
    return isometricTaxiLayoutModel.translated(taxiLayout, vector2.scale(originPosition, -1));
  }
);

/**
 * Given a nodeID (aka entity_id) get the indexed process event.
 * Legacy functions take process events instead of nodeID, use this to get
 * process events for them.
 */
export const processEventForID: (
  state: DataState
) => (nodeID: string) => SafeResolverEvent | null = createSelector(
  tree,
  (indexedProcessTree) => (nodeID: string) => {
    return indexedProcessTreeModel.processEvent(indexedProcessTree, nodeID);
  }
);

/**
 * Takes a nodeID (aka entity_id) and returns the associated aria level as a number or null if the node ID isn't in the tree.
 */
export const ariaLevel: (state: DataState) => (nodeID: string) => number | null = createSelector(
  layout,
  processEventForID,
  ({ ariaLevels }, processEventGetter) => (nodeID: string) => {
    const node = processEventGetter(nodeID);
    return node ? ariaLevels.get(node) ?? null : null;
  }
);

/**
 * Returns the following sibling if there is one, or `null` if there isn't.
 * For root nodes, other root nodes are treated as siblings.
 * This is used to calculate the `aria-flowto` attribute.
 */
export const ariaFlowtoCandidate: (
  state: DataState
) => (nodeID: string) => string | null = createSelector(
  tree,
  processEventForID,
  (indexedProcessTree, eventGetter) => {
    // A map of preceding sibling IDs to following sibling IDs or `null`, if there is no following sibling
    const memo: Map<string, string | null> = new Map();

    return function memoizedGetter(/** the unique ID of a node. **/ nodeID: string): string | null {
      // Previous calculations are memoized. Check for a value in the memo.
      const existingValue = memo.get(nodeID);

      /**
       * `undefined` means the key wasn't in the map.
       * Note: the value may be null, meaning that we checked and there is no following sibling.
       * If there is a value in the map, return it.
       */
      if (existingValue !== undefined) {
        return existingValue;
      }

      /**
       * Getting the following sibling of a node has an `O(n)` time complexity where `n` is the number of children the parent of the node has.
       * For this reason, we calculate the following siblings of the node and all of its siblings at once and cache them.
       */
      const nodeEvent: SafeResolverEvent | null = eventGetter(nodeID);

      if (!nodeEvent) {
        // this should never happen.
        throw new Error('could not find child event in process tree.');
      }

      // nodes with the same parent ID
      const children = indexedProcessTreeModel.children(
        indexedProcessTree,
        eventModel.parentEntityIDSafeVersion(nodeEvent)
      );

      let previousChild: SafeResolverEvent | null = null;
      // Loop over all nodes that have the same parent ID (even if the parent ID is undefined or points to a node that isn't in the tree.)
      for (const child of children) {
        if (previousChild !== null) {
          // Set the `child` as the following sibling of `previousChild`.
          const previousChildEntityID = eventModel.entityIDSafeVersion(previousChild);
          const followingSiblingEntityID = eventModel.entityIDSafeVersion(child);
          if (previousChildEntityID !== undefined && followingSiblingEntityID !== undefined) {
            memo.set(previousChildEntityID, followingSiblingEntityID);
          }
        }
        // Set the child as the previous child.
        previousChild = child;
      }

      if (previousChild) {
        // if there is a previous child, it has no following sibling.
        const entityID = eventModel.entityIDSafeVersion(previousChild);
        if (entityID !== undefined) {
          memo.set(entityID, null);
        }
      }

      return memoizedGetter(nodeID);
    };
  }
);

const spatiallyIndexedLayout: (state: DataState) => rbush<IndexedEntity> = createSelector(
  layout,
  function ({ processNodePositions, edgeLineSegments }) {
    const spatialIndex: rbush<IndexedEntity> = new rbush();
    const processesToIndex: IndexedProcessNode[] = [];
    const edgeLineSegmentsToIndex: IndexedEdgeLineSegment[] = [];

    // Make sure these numbers are big enough to cover the process nodes at all zoom levels.
    // The process nodes don't extend equally in all directions from their center point.
    const processNodeViewWidth = 720;
    const processNodeViewHeight = 240;
    const lineSegmentPadding = 30;
    for (const [processEvent, position] of processNodePositions) {
      const [nodeX, nodeY] = position;
      const indexedEvent: IndexedProcessNode = {
        minX: nodeX - 0.5 * processNodeViewWidth,
        minY: nodeY - 0.5 * processNodeViewHeight,
        maxX: nodeX + 0.5 * processNodeViewWidth,
        maxY: nodeY + 0.5 * processNodeViewHeight,
        position,
        entity: processEvent,
        type: 'processNode',
      };
      processesToIndex.push(indexedEvent);
    }
    for (const edgeLineSegment of edgeLineSegments) {
      const {
        points: [[x1, y1], [x2, y2]],
      } = edgeLineSegment;
      const indexedLineSegment: IndexedEdgeLineSegment = {
        minX: Math.min(x1, x2) - lineSegmentPadding,
        minY: Math.min(y1, y2) - lineSegmentPadding,
        maxX: Math.max(x1, x2) + lineSegmentPadding,
        maxY: Math.max(y1, y2) + lineSegmentPadding,
        entity: edgeLineSegment,
        type: 'edgeLine',
      };
      edgeLineSegmentsToIndex.push(indexedLineSegment);
    }
    spatialIndex.load([...processesToIndex, ...edgeLineSegmentsToIndex]);
    return spatialIndex;
  }
);

/**
 * Returns nodes and edge lines that could be visible in the `query`.
 */
export const nodesAndEdgelines: (
  state: DataState
) => (
  /**
   * An axis aligned bounding box (in world corrdinates) to search in. Any entities that might collide with this box will be returned.
   */
  query: AABB
) => VisibleEntites = createSelector(spatiallyIndexedLayout, function (spatialIndex) {
  /**
   * Memoized for performance and object reference equality.
   */
  return defaultMemoize((boundingBox: AABB) => {
    const {
      minimum: [minX, minY],
      maximum: [maxX, maxY],
    } = boundingBox;
    const entities = spatialIndex.search({
      minX,
      minY,
      maxX,
      maxY,
    });
    const visibleProcessNodePositions = new Map<SafeResolverEvent, Vector2>(
      entities
        .filter((entity): entity is IndexedProcessNode => entity.type === 'processNode')
        .map((node) => [node.entity, node.position])
    );
    const connectingEdgeLineSegments = entities
      .filter((entity): entity is IndexedEdgeLineSegment => entity.type === 'edgeLine')
      .map((node) => node.entity);
    return {
      processNodePositions: visibleProcessNodePositions,
      connectingEdgeLineSegments,
    };
  });
});

/**
 * If there is a pending request that's for a entity ID that doesn't matche the `entityID`, then we should cancel it.
 */
export function treeRequestParametersToAbort(state: DataState): TreeFetcherParameters | null {
  /**
   * If there is a pending request, and its not for the current parameters (even, if the current parameters are undefined) then we should abort the request.
   */
  if (
    state.tree?.pendingRequestParameters !== undefined &&
    !treeFetcherParametersModel.equal(
      state.tree?.pendingRequestParameters,
      state.tree?.currentParameters
    )
  ) {
    return state.tree.pendingRequestParameters;
  } else {
    return null;
  }
}

/**
 * Total count of events related to `node`.
 * Based on `ResolverNodeStats`
 */
export const totalRelatedEventCountForNode: (
  state: DataState
) => (nodeID: string) => number | undefined = createSelector(
  relatedEventsStats,
  (stats) => (nodeID: string) => {
    const nodeStats = stats(nodeID);
    return nodeStats === undefined ? undefined : nodeStats.events.total;
  }
);

/**
 * Count of events with `category` related to `nodeID`.
 * Based on `ResolverNodeStats`
 */
export const relatedEventCountOfTypeForNode: (
  state: DataState
) => (nodeID: string, category: string) => number | undefined = createSelector(
  relatedEventsStats,
  (stats) => (nodeID: string, category: string) => {
    const nodeStats = stats(nodeID);
    if (!nodeStats) {
      return undefined;
    } else {
      return nodeStats.events.byCategory[category];
    }
  }
);

/**
 * Which view should show in the panel, as well as what parameters should be used.
 * Calculated using the query string
 */
export const panelViewAndParameters = createSelector(
  (state: DataState) => state.locationSearch,
  resolverComponentInstanceID,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  (locationSearch, resolverComponentInstanceID) => {
    return panelViewAndParametersFromLocationSearchAndResolverComponentInstanceID({
      locationSearch,
      resolverComponentInstanceID,
    });
  }
);

/**
 * Events related to the panel node that are in the panel category.
 * NB: This cannot tell the view loading information. For example, this does not tell the view if data has been requested or if data failed to load.
 */
export const nodeEventsInCategory = (state: DataState) => {
  return state.nodeEventsInCategory?.events ?? [];
};

export const lastRelatedEventResponseContainsCursor = createSelector(
  (state: DataState) => state.nodeEventsInCategory,
  panelViewAndParameters,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function (nodeEventsInCategory, panelViewAndParameters) {
    if (
      nodeEventsInCategory !== undefined &&
      nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
        nodeEventsInCategory,
        panelViewAndParameters
      )
    ) {
      return nodeEventsInCategory.cursor !== null;
    } else {
      return false;
    }
  }
);

export const hadErrorLoadingNodeEventsInCategory = createSelector(
  (state: DataState) => state.nodeEventsInCategory,
  panelViewAndParameters,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function (nodeEventsInCategory, panelViewAndParameters) {
    if (
      nodeEventsInCategory !== undefined &&
      nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
        nodeEventsInCategory,
        panelViewAndParameters
      )
    ) {
      return nodeEventsInCategory && nodeEventsInCategory.error === true;
    } else {
      return false;
    }
  }
);

export const isLoadingNodeEventsInCategory = createSelector(
  (state: DataState) => state.nodeEventsInCategory,
  panelViewAndParameters,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function (nodeEventsInCategory, panelViewAndParameters) {
    const { panelView } = panelViewAndParameters;
    if (panelView === 'nodeEventsInCategory') {
      return nodeEventsInCategory?.loading;
    }
  }
);

export const isLoadingMoreNodeEventsInCategory = createSelector(
  (state: DataState) => state.nodeEventsInCategory,
  panelViewAndParameters,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function (nodeEventsInCategory, panelViewAndParameters) {
    if (
      nodeEventsInCategory !== undefined &&
      nodeEventsInCategoryModel.isRelevantToPanelViewAndParameters(
        nodeEventsInCategory,
        panelViewAndParameters
      )
    ) {
      return (
        nodeEventsInCategory &&
        nodeEventsInCategory.lastCursorRequested !== null &&
        nodeEventsInCategory.cursor === nodeEventsInCategory.lastCursorRequested
      );
    } else {
      return false;
    }
  }
);

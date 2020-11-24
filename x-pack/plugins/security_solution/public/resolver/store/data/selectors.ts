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
  IndexedTreeNode,
  AABB,
  VisibleEntites,
  TreeFetcherParameters,
  IsometricTaxiLayout,
  IDToNodeInfo,
  NodeData,
} from '../../types';
import * as indexedProcessTreeModel from '../../models/indexed_process_tree';
import * as nodeModel from '../../../../common/endpoint/models/node';
import * as nodeEventsInCategoryModel from './node_events_in_category_model';
import {
  SafeResolverEvent,
  NewResolverTree,
  ResolverNode,
  EventStats,
} from '../../../../common/endpoint/types';
import * as resolverTreeModel from '../../models/resolver_tree';
import * as treeFetcherParametersModel from '../../models/tree_fetcher_parameters';
import * as isometricTaxiLayoutModel from '../../models/indexed_process_tree/isometric_taxi_layout'; // TODO replace with indexed
import * as aabbModel from '../../models/aabb';
import * as vector2 from '../../models/vector2';

/**
 * Was a request made for graph data
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
 * The number of requested ancestors from the server. If zero ancestors were requested
 * then the server would still return the origin node.
 */
export function resolverRequestedAncestors(state: DataState): number {
  return state.tree?.lastResponse?.parameters.requestedAncestors ?? 0;
}

/**
 * The number of requested descendants from the server.
 */
export function resolverRequestedDescendants(state: DataState): number {
  return state.tree?.lastResponse?.parameters.requestedAncestors ?? 0;
}

/**
 * The last NewResolverTree we received, if any. It may be stale (it might not be for the same databaseDocumentID that
 * we're currently interested in.
 */
const resolverTreeResponse = (state: DataState): NewResolverTree | undefined => {
  return state.tree?.lastResponse?.successful ? state.tree?.lastResponse.result : undefined;
};

/**
 * the node ID of the node representing the databaseDocumentID.
 * NB: this could be stale if the last response is stale
 */
export const originID: (state: DataState) => string | undefined = createSelector(
  resolverTreeResponse,
  function (resolverTree?) {
    return resolverTree?.originId ?? undefined;
  }
);

/**
 * Returns a data structure for accessing events for specific nodes in a graph. For Endpoint graphs these nodes will be
 * process lifecycle events.
 */
export const nodeData = (state: DataState): IDToNodeInfo | undefined => {
  return state.nodeData;
};

/**
 * Returns a function that can be called to retrieve the node data for a specific node ID.
 */
export const nodeDataForID: (
  state: DataState
) => (id: string) => NodeData | undefined = createSelector(nodeData, (nodeInfo) => {
  return (id: string) => {
    const info = nodeInfo?.get(id);
    return info;
  };
});

/**
 * Returns a function that can be called to retrieve the state of the node, running, loading, or terminated.
 */
export const getNodeState: (
  state: DataState
) => (id: string) => 'running' | 'loading' | 'terminated' = createSelector(
  nodeDataForID,
  (nodeInfo) => {
    return (id: string) => {
      const info = nodeInfo(id);
      if (!info || info.status === 'requested') {
        return 'loading';
      }
      return info.terminated ? 'terminated' : 'running';
    };
  }
);

/**
 * Returns a function that can be called to retrieve whether the node is in the loading state.
 */
export const isNodeDataLoading: (state: DataState) => (id: string) => boolean = createSelector(
  nodeDataForID,
  (nodeInfo) => {
    return (id: string) => {
      const info = nodeInfo(id);
      return !info || info.status === 'requested';
    };
  }
);

/**
 * Process events that will be graphed.
 */
export const graphableNodes = createSelector(resolverTreeResponse, function (treeResponse?) {
  // Keep track of the last process event (in array order) for each entity ID
  const nodes: Map<string, ResolverNode> = new Map();
  if (treeResponse) {
    for (const node of treeResponse.nodes) {
      const nodeId = nodeModel.nodeID(node);
      if (nodeId !== undefined) {
        nodes.set(nodeId, node);
      }
    }
    return [...nodes.values()];
  } else {
    return [];
  }
});

export const tree = createSelector(graphableNodes, originID, function indexedProcessTree(
  // eslint-disable-next-line @typescript-eslint/no-shadow
  graphableNodes,
  originId
) {
  return indexedProcessTreeModel.factory(graphableNodes, originId);
});

/**
 * This returns a map of nodeIds to the associated stats provided by the datasource.
 */
export const nodeStats: (
  state: DataState
) => (nodeID: string) => EventStats | undefined = createSelector(
  resolverTreeResponse,
  (resolverTree?: NewResolverTree) => {
    if (resolverTree) {
      const map = resolverTreeModel.nodeStats(resolverTree);
      return (nodeId: string) => map.get(nodeId);
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
) => (entityID: string) => number | undefined = createSelector(nodeStats, (getNodeStats) => {
  return (nodeId) => {
    return getNodeStats(nodeId)?.total;
  };
});

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

/**
 *
 *
 * @export
 * @param {DataState} state
 * @returns {(ResolverNode | null)} the current related event data for the `event_detail` view
 */
export function currentRelatedEventData(state: DataState): SafeResolverEvent | null {
  return state.currentRelatedEvent.data;
}

export const relatedEventCountByCategory: (
  state: DataState
) => (nodeID: string, eventCategory: string) => number | undefined = createSelector(
  nodeStats,
  (getNodeStats) => {
    return (nodeID: string, eventCategory: string): number | undefined => {
      const stats = getNodeStats(nodeID);
      if (stats) {
        const value = Object.prototype.hasOwnProperty.call(stats.byCategory, eventCategory);
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value;
        }
      }
    };
  }
);

/**
 * Returns true if there might be more descendants in the graph that we didn't get because
 * we reached the requested descendants limit.
 *
 * If we set a limit at 10 and we received 9, then we know there weren't anymore. If we received
 * 10, there might be more.
 */
export const hasMoreChildren: (state: DataState) => boolean = createSelector(
  tree,
  resolverRequestedDescendants,
  (resolverTree, requestedDescendants) => {
    return indexedProcessTreeModel.countChildren(resolverTree) >= requestedDescendants;
  }
);

/**
 * Returns true if there might be more ancestors in the graph that we didn't get because
 * we reached the requested limit.
 *
 * If we set a limit at 10 and we received 9, then we know there weren't anymore. If we received
 * 10, there might be more.
 */
export const hasMoreAncestors: (state: DataState) => boolean = createSelector(
  tree,
  resolverRequestedAncestors,
  (resolverTree, requestedAncestors) => {
    return indexedProcessTreeModel.countAncestors(resolverTree) >= requestedAncestors;
  }
);

/**
 * If the tree resource needs to be fetched then these are the parameters that should be used.
 */
export function treeParametersToFetch(state: DataState): TreeFetcherParameters | null {
  /**
   * If there are current tree parameters that don't match the parameters used in the pending request (if there is a pending request) and that don't match the parameters used in the last completed request (if there was a last completed request) then we need to fetch the tree resource using the current parameters.
   */
  if (
    state.tree?.currentParameters !== undefined &&
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
}

export const layout: (state: DataState) => IsometricTaxiLayout = createSelector(
  tree,
  originID,
  function processNodePositionsAndEdgeLineSegments(indexedProcessTree, originId) {
    // use the isometric taxi layout as a base
    const taxiLayout = isometricTaxiLayoutModel.isometricTaxiLayoutFactory(indexedProcessTree);
    if (!originId) {
      // no data has loaded.
      return taxiLayout;
    }

    // find the origin node
    const originNode = indexedProcessTreeModel.treeNode(indexedProcessTree, originId);
    if (originNode === null) {
      // If a tree is returned that has no process events for the origin, this can happen.
      return taxiLayout;
    }

    // Find the position of the origin, we'll center the map on it intrinsically
    const originPosition = isometricTaxiLayoutModel.nodePosition(taxiLayout, originId);
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
export const graphNodeForID: (
  state: DataState
) => (nodeID: string) => ResolverNode | null = createSelector(
  tree,
  (indexedProcessTree) => (nodeID: string) => {
    return indexedProcessTreeModel.treeNode(indexedProcessTree, nodeID);
  }
);

/**
 * Takes a nodeID (aka entity_id) and returns the associated aria level as a number or null if the node ID isn't in the tree.
 */
export const ariaLevel: (state: DataState) => (nodeID: string) => number | null = createSelector(
  layout,
  graphNodeForID,
  ({ ariaLevels }, graphNodeGetter) => (nodeID: string) => {
    const node = graphNodeGetter(nodeID);
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
  graphNodeForID,
  (indexedProcessTree, nodeGetter) => {
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
      const node: ResolverNode | null = nodeGetter(nodeID);

      if (!node) {
        // this should never happen.
        throw new Error('could not find child event in process tree.');
      }

      // nodes with the same parent ID
      const children = indexedProcessTreeModel.children(
        indexedProcessTree,
        nodeModel.parentId(node)
      );

      let previousChild: ResolverNode | null = null;
      // Loop over all nodes that have the same parent ID (even if the parent ID is undefined or points to a node that isn't in the tree.)
      for (const child of children) {
        if (previousChild !== null) {
          // Set the `child` as the following sibling of `previousChild`.
          const previousChildNodeId = nodeModel.nodeID(previousChild);
          const followingSiblingEntityID = nodeModel.nodeID(child);
          if (previousChildNodeId !== undefined && followingSiblingEntityID !== undefined) {
            memo.set(previousChildNodeId, followingSiblingEntityID);
          }
        }
        // Set the child as the previous child.
        previousChild = child;
      }

      if (previousChild) {
        // if there is a previous child, it has no following sibling.
        const nodeId = nodeModel.nodeID(previousChild);
        if (nodeId !== undefined) {
          memo.set(nodeId, null);
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
    const nodeToIndex: IndexedTreeNode[] = [];
    const edgeLineSegmentsToIndex: IndexedEdgeLineSegment[] = [];

    // Make sure these numbers are big enough to cover the process nodes at all zoom levels.
    // The process nodes don't extend equally in all directions from their center point.
    const graphNodeViewWidth = 720;
    const graphNodeViewHeight = 240;
    const lineSegmentPadding = 30;
    for (const [treeNode, position] of processNodePositions) {
      const [nodeX, nodeY] = position;
      const indexedEvent: IndexedTreeNode = {
        minX: nodeX - 0.5 * graphNodeViewWidth,
        minY: nodeY - 0.5 * graphNodeViewHeight,
        maxX: nodeX + 0.5 * graphNodeViewWidth,
        maxY: nodeY + 0.5 * graphNodeViewHeight,
        position,
        entity: treeNode,
        type: 'treeNode',
      };
      nodeToIndex.push(indexedEvent);
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
    spatialIndex.load([...nodeToIndex, ...edgeLineSegmentsToIndex]);
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
    const visibleProcessNodePositions = new Map<ResolverNode, Vector2>(
      entities
        .filter((entity): entity is IndexedTreeNode => entity.type === 'treeNode')
        .map((node) => [node.entity, node.position])
    );
    const connectingEdgeLineSegments = entities
      .filter((entity): entity is IndexedEdgeLineSegment => entity.type === 'edgeLine')
      .map((node) => node.entity);
    return {
      processNodePositions: visibleProcessNodePositions,
      connectingEdgeLineSegments,
    };
  }, aaBBEqualityCheck);
});

function isAABBType(value: unknown): value is AABB {
  const castValue = value as AABB;
  return castValue.maximum !== undefined && castValue.minimum !== undefined;
}

function aaBBEqualityCheck<T>(a: T, b: T, index: number): boolean {
  if (isAABBType(a) && isAABBType(b)) {
    return aabbModel.isEqual(a, b);
  } else {
    // this is equivalent to the default equality check for defaultMemoize
    return a === b;
  }
}

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
 * The sum of all related event categories for a process.
 */
export const statsTotalForNode: (
  state: DataState
) => (event: ResolverNode) => number | null = createSelector(nodeStats, (getNodeStats) => {
  return (node: ResolverNode) => {
    const nodeID = nodeModel.nodeID(node);
    if (nodeID === undefined) {
      return null;
    }
    const stats = getNodeStats(nodeID);
    if (!stats) {
      return null;
    }
    return stats.total;
  };
});

/**
 * Total count of events related to `node`.
 * Based on `ResolverNodeStats`
 */
export const totalRelatedEventCountForNode: (
  state: DataState
) => (nodeID: string) => number | undefined = createSelector(
  nodeStats,
  (getNodeStats) => (nodeID: string) => {
    const stats = getNodeStats(nodeID);
    return stats === undefined ? undefined : stats.total;
  }
);

/**
 * Count of events with `category` related to `nodeID`.
 * Based on `ResolverNodeStats`
 */
export const relatedEventCountOfTypeForNode: (
  state: DataState
) => (nodeID: string, category: string) => number | undefined = createSelector(
  nodeStats,
  (getNodeStats) => (nodeID: string, category: string) => {
    const stats = getNodeStats(nodeID);
    if (!stats) {
      return undefined;
    } else {
      return stats.byCategory[category];
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
    return panelView === 'nodeEventsInCategory' && nodeEventsInCategory === undefined;
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

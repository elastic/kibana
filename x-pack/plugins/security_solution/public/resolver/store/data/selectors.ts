/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rbush from 'rbush';
import { createSelector } from 'reselect';
import {
  DataState,
  AdjacentProcessMap,
  Vector2,
  IndexedEntity,
  IndexedEdgeLineSegment,
  IndexedProcessNode,
  AABB,
  VisibleEntites,
} from '../../types';
import {
  isGraphableProcess,
  isTerminatedProcess,
  uniquePidForProcess,
} from '../../models/process_event';
import { factory as indexedProcessTreeFactory } from '../../models/indexed_process_tree';
import { isEqual } from '../../models/aabb';

import {
  ResolverEvent,
  ResolverTree,
  ResolverNodeStats,
  ResolverRelatedEvents,
} from '../../../../common/endpoint/types';
import * as resolverTreeModel from '../../models/resolver_tree';
import { isometricTaxiLayout } from '../../models/indexed_process_tree/isometric_taxi_layout';

/**
 * If there is currently a request.
 */
export function isLoading(state: DataState): boolean {
  return state.pendingRequestDatabaseDocumentID !== undefined;
}

/**
 * If a request was made and it threw an error or returned a failure response code.
 */
export function hasError(state: DataState): boolean {
  if (state.lastResponse && state.lastResponse.successful === false) {
    return true;
  } else {
    return false;
  }
}

/**
 * The last ResolverTree we received, if any. It may be stale (it might not be for the same databaseDocumentID that
 * we're currently interested in.
 */
const resolverTree = (state: DataState): ResolverTree | undefined => {
  if (state.lastResponse && state.lastResponse.successful) {
    return state.lastResponse.result;
  } else {
    return undefined;
  }
};

/**
 * Process events that will be displayed as terminated.
 */
export const terminatedProcesses = createSelector(resolverTree, function (tree?: ResolverTree) {
  if (!tree) {
    return new Set();
  }
  return new Set(
    resolverTreeModel
      .lifecycleEvents(tree)
      .filter(isTerminatedProcess)
      .map((terminatedEvent) => {
        return uniquePidForProcess(terminatedEvent);
      })
  );
});

/**
 * Process events that will be graphed.
 */
export const graphableProcesses = createSelector(resolverTree, function (tree?) {
  if (tree) {
    return resolverTreeModel.lifecycleEvents(tree).filter(isGraphableProcess);
  } else {
    return [];
  }
});

/**
 * The 'indexed process tree' contains the tree data, indexed in helpful ways. Used for O(1) access to stuff during graph layout.
 */
export const indexedProcessTree = createSelector(graphableProcesses, function indexedTree(
  /* eslint-disable no-shadow */
  graphableProcesses
  /* eslint-enable no-shadow */
) {
  return indexedProcessTreeFactory(graphableProcesses);
});

/**
 * This returns a map of entity_ids to stats about the related events and alerts.
 */
export const relatedEventsStats: (
  state: DataState
) => Map<string, ResolverNodeStats> | null = createSelector(resolverTree, (tree?: ResolverTree) => {
  if (tree) {
    return resolverTreeModel.relatedEventsStats(tree);
  } else {
    return null;
  }
});

/**
 * returns a map of entity_ids to related event data.
 */
export function relatedEventsByEntityId(data: DataState): Map<string, ResolverRelatedEvents> {
  return data.relatedEvents;
}

/**
 * returns a map of entity_ids to booleans indicating if it is waiting on related event
 * A value of `undefined` can be interpreted as `not yet requested`
 */
export function relatedEventsReady(data: DataState): Map<string, boolean> {
  return data.relatedEventsReady;
}

export const processAdjacencies = createSelector(
  indexedProcessTree,
  graphableProcesses,
  function selectProcessAdjacencies(
    /* eslint-disable no-shadow */
    indexedProcessTree,
    graphableProcesses
    /* eslint-enable no-shadow */
  ) {
    const processToAdjacencyMap = new Map<ResolverEvent, AdjacentProcessMap>();
    const { idToAdjacent } = indexedProcessTree;

    for (const graphableProcess of graphableProcesses) {
      const processPid = uniquePidForProcess(graphableProcess);
      const adjacencyMap = idToAdjacent.get(processPid)!;
      processToAdjacencyMap.set(graphableProcess, adjacencyMap);
    }
    return { processToAdjacencyMap };
  }
);

/**
 * `true` if there were more children than we got in the last request.
 */
export function hasMoreChildren(state: DataState): boolean {
  const tree = resolverTree(state);
  return tree ? resolverTreeModel.hasMoreChildren(tree) : false;
}

/**
 * `true` if there were more ancestors than we got in the last request.
 */
export function hasMoreAncestors(state: DataState): boolean {
  const tree = resolverTree(state);
  return tree ? resolverTreeModel.hasMoreAncestors(tree) : false;
}

/**
 * If we need to fetch, this is the ID to fetch.
 */
export function databaseDocumentIDToFetch(state: DataState): string | null {
  // If there is an ID, it must match either the last received version, or the pending version.
  // Otherwise, we need to fetch it
  // NB: this technique will not allow for refreshing of data.
  if (
    state.databaseDocumentID !== undefined &&
    state.databaseDocumentID !== state.pendingRequestDatabaseDocumentID &&
    state.databaseDocumentID !== state.lastResponse?.databaseDocumentID
  ) {
    return state.databaseDocumentID;
  } else {
    return null;
  }
}
export const processNodePositionsAndEdgeLineSegments = createSelector(
  indexedProcessTree,
  function processNodePositionsAndEdgeLineSegments(
    /* eslint-disable no-shadow */
    indexedProcessTree
    /* eslint-enable no-shadow */
  ) {
    return isometricTaxiLayout(indexedProcessTree);
  }
);

const indexedProcessNodePositionsAndEdgeLineSegments = createSelector(
  processNodePositionsAndEdgeLineSegments,
  function visibleProcessNodePositionsAndEdgeLineSegments({
    /* eslint-disable no-shadow */
    processNodePositions,
    edgeLineSegments,
    /* eslint-enable no-shadow */
  }) {
    const tree: rbush<IndexedEntity> = new rbush();
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
    tree.load([...processesToIndex, ...edgeLineSegmentsToIndex]);
    return tree;
  }
);

export const visibleProcessNodePositionsAndEdgeLineSegments = createSelector(
  indexedProcessNodePositionsAndEdgeLineSegments,
  function visibleProcessNodePositionsAndEdgeLineSegments(tree) {
    // memoize the results of this call to avoid unnecessarily rerunning
    let lastBoundingBox: AABB | null = null;
    let currentlyVisible: VisibleEntites = {
      processNodePositions: new Map<ResolverEvent, Vector2>(),
      connectingEdgeLineSegments: [],
    };
    return (boundingBox: AABB) => {
      if (lastBoundingBox !== null && isEqual(lastBoundingBox, boundingBox)) {
        return currentlyVisible;
      } else {
        const {
          minimum: [minX, minY],
          maximum: [maxX, maxY],
        } = boundingBox;
        const entities = tree.search({
          minX,
          minY,
          maxX,
          maxY,
        });
        const visibleProcessNodePositions = new Map<ResolverEvent, Vector2>(
          entities
            .filter((entity): entity is IndexedProcessNode => entity.type === 'processNode')
            .map((node) => [node.entity, node.position])
        );
        const connectingEdgeLineSegments = entities
          .filter((entity): entity is IndexedEdgeLineSegment => entity.type === 'edgeLine')
          .map((node) => node.entity);
        currentlyVisible = {
          processNodePositions: visibleProcessNodePositions,
          connectingEdgeLineSegments,
        };
        lastBoundingBox = boundingBox;
        return currentlyVisible;
      }
    };
  }
);
/**
 * If there is a pending request that's for a entity ID that doesn't matche the `entityID`, then we should cancel it.
 */
export function databaseDocumentIDToAbort(state: DataState): string | null {
  /**
   * If there is a pending request, and its not for the current databaseDocumentID (even, if the current databaseDocumentID is undefined) then we should abort the request.
   */
  if (
    state.pendingRequestDatabaseDocumentID !== undefined &&
    state.pendingRequestDatabaseDocumentID !== state.databaseDocumentID
  ) {
    return state.pendingRequestDatabaseDocumentID;
  } else {
    return null;
  }
}

/**
 * `ResolverNodeStats` for a process (`ResolverEvent`)
 */
const relatedEventStatsForProcess: (
  state: DataState
) => (event: ResolverEvent) => ResolverNodeStats | null = createSelector(
  relatedEventsStats,
  (statsMap) => {
    if (!statsMap) {
      return () => null;
    }
    return (event: ResolverEvent) => {
      const nodeStats = statsMap.get(uniquePidForProcess(event));
      if (!nodeStats) {
        return null;
      }
      return nodeStats;
    };
  }
);

/**
 * The sum of all related event categories for a process.
 */
export const relatedEventTotalForProcess: (
  state: DataState
) => (event: ResolverEvent) => number | null = createSelector(
  relatedEventStatsForProcess,
  (statsForProcess) => {
    return (event: ResolverEvent) => {
      const stats = statsForProcess(event);
      if (!stats) {
        return null;
      }
      let total = 0;
      for (const value of Object.values(stats.events.byCategory)) {
        total += value;
      }
      return total;
    };
  }
);

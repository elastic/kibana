/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rbush from 'rbush';
import { createSelector, defaultMemoize } from 'reselect';
import {
  DataState,
  Vector2,
  IndexedEntity,
  IndexedEdgeLineSegment,
  IndexedProcessNode,
  AABB,
  VisibleEntites,
  SectionData,
} from '../../types';
import {
  isGraphableProcess,
  isTerminatedProcess,
  uniquePidForProcess,
  uniqueParentPidForProcess,
} from '../../models/process_event';
import * as indexedProcessTreeModel from '../../models/indexed_process_tree';

import {
  ResolverEvent,
  ResolverTree,
  ResolverNodeStats,
  ResolverRelatedEvents,
  SafeResolverEvent,
  EndpointEvent,
  LegacyEndpointEvent,
} from '../../../../common/endpoint/types';
import * as resolverTreeModel from '../../models/resolver_tree';
import * as isometricTaxiLayoutModel from '../../models/indexed_process_tree/isometric_taxi_layout';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as vector2 from '../../models/vector2';
import { formatDate } from '../../view/panels/panel_content_utilities';

/**
 * If there is currently a request.
 */
export function isLoading(state: DataState): boolean {
  return state.pendingRequestDatabaseDocumentID !== undefined;
}

/**
 * A string for uniquely identifying the instance of resolver within the app.
 */
export function resolverComponentInstanceID(state: DataState): string {
  return state.resolverComponentInstanceID ? state.resolverComponentInstanceID : '';
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
const resolverTreeResponse = (state: DataState): ResolverTree | undefined => {
  if (state.lastResponse && state.lastResponse.successful) {
    return state.lastResponse.result;
  } else {
    return undefined;
  }
};

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
export const terminatedProcesses = createSelector(resolverTreeResponse, function (
  tree?: ResolverTree
) {
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
 * A function that given an entity id returns a boolean indicating if the id is in the set of terminated processes.
 */
export const isProcessTerminated = createSelector(terminatedProcesses, function (
  /* eslint-disable no-shadow */
  terminatedProcesses
  /* eslint-enable no-shadow */
) {
  return (entityId: string) => {
    return terminatedProcesses.has(entityId);
  };
});

/**
 * Process events that will be graphed.
 */
export const graphableProcesses = createSelector(resolverTreeResponse, function (tree?) {
  // Keep track of the last process event (in array order) for each entity ID
  const events: Map<string, ResolverEvent> = new Map();
  if (tree) {
    for (const event of resolverTreeModel.lifecycleEvents(tree)) {
      if (isGraphableProcess(event)) {
        const entityID = uniquePidForProcess(event);
        events.set(entityID, event);
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
  /* eslint-disable no-shadow */
  graphableProcesses
  /* eslint-enable no-shadow */
) {
  return indexedProcessTreeModel.factory(graphableProcesses as SafeResolverEvent[]);
});

/**
 * This returns a map of entity_ids to stats about the related events and alerts.
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
 * returns a map of entity_ids to related event data.
 */
export function relatedEventsByEntityId(data: DataState): Map<string, ResolverRelatedEvents> {
  return data.relatedEvents;
}

/**
 * A helper function to turn objects into EuiDescriptionList entries.
 * This reflects the strategy of more or less "dumping" metadata for related processes
 * in description lists with little/no 'prettification'. This has the obvious drawback of
 * data perhaps appearing inscrutable/daunting, but the benefit of presenting these fields
 * to the user "as they occur" in ECS, which may help them with e.g. EQL queries.
 *
 * Given an object like: {a:{b: 1}, c: 'd'} it will yield title/description entries like so:
 * {title: "a.b", description: "1"}, {title: "c", description: "d"}
 *
 * @param {object} obj The object to turn into `<dt><dd>` entries
 */
const objectToDescriptionListEntries = function* (
  obj: object,
  prefix = ''
): Generator<{ title: string; description: string }> {
  const nextPrefix = prefix.length ? `${prefix}.` : '';
  for (const [metaKey, metaValue] of Object.entries(obj)) {
    if (typeof metaValue === 'number' || typeof metaValue === 'string') {
      yield { title: nextPrefix + metaKey, description: `${metaValue}` };
    } else if (metaValue instanceof Array) {
      yield {
        title: nextPrefix + metaKey,
        description: metaValue
          .filter((arrayEntry) => {
            return typeof arrayEntry === 'number' || typeof arrayEntry === 'string';
          })
          .join(','),
      };
    } else if (typeof metaValue === 'object') {
      yield* objectToDescriptionListEntries(metaValue, nextPrefix + metaKey);
    }
  }
};

/**
 * Returns a function that returns the information needed to display related event details based on
 * the related event's entityID and its own ID.
 */
export const relatedEventDisplayInfoByEntityAndSelfID: (
  state: DataState
) => (
  entityId: string,
  relatedEventId: string | number
) => [
  EndpointEvent | LegacyEndpointEvent | undefined,
  number,
  string | undefined,
  SectionData,
  string
] = createSelector(relatedEventsByEntityId, function relatedEventDetails(
  /* eslint-disable no-shadow */
  relatedEventsByEntityId
  /* eslint-enable no-shadow */
) {
  return defaultMemoize((entityId: string, relatedEventId: string | number) => {
    const relatedEventsForThisProcess = relatedEventsByEntityId.get(entityId);
    if (!relatedEventsForThisProcess) {
      return [undefined, 0, undefined, [], ''];
    }
    const specificEvent = relatedEventsForThisProcess.events.find(
      (evt) => eventModel.eventId(evt) === relatedEventId
    );
    // For breadcrumbs:
    const specificCategory = specificEvent && eventModel.primaryEventCategory(specificEvent);
    const countOfCategory = relatedEventsForThisProcess.events.reduce((sumtotal, evt) => {
      return eventModel.primaryEventCategory(evt) === specificCategory ? sumtotal + 1 : sumtotal;
    }, 0);

    // Assuming these details (agent, ecs, process) aren't as helpful, can revisit
    const { agent, ecs, process, ...relevantData } = specificEvent as ResolverEvent & {
      // Type this with various unknown keys so that ts will let us delete those keys
      ecs: unknown;
      process: unknown;
    };

    let displayDate = '';
    const sectionData: SectionData = Object.entries(relevantData)
      .map(([sectionTitle, val]) => {
        if (sectionTitle === '@timestamp') {
          displayDate = formatDate(val);
          return { sectionTitle: '', entries: [] };
        }
        if (typeof val !== 'object') {
          return { sectionTitle, entries: [{ title: sectionTitle, description: `${val}` }] };
        }
        return { sectionTitle, entries: [...objectToDescriptionListEntries(val)] };
      })
      .filter((v) => v.sectionTitle !== '' && v.entries.length);

    return [specificEvent, countOfCategory, specificCategory, sectionData, displayDate];
  });
});

/**
 * Returns a function that returns a function (when supplied with an entity id for a node)
 * that returns related events for a node that match an event.category (when supplied with the category)
 */
export const relatedEventsByCategory: (
  state: DataState
) => (entityID: string) => (ecsCategory: string) => ResolverEvent[] = createSelector(
  relatedEventsByEntityId,
  function provideGettersByCategory(
    /* eslint-disable no-shadow */
    relatedEventsByEntityId
    /* eslint-enable no-shadow */
  ) {
    return defaultMemoize((entityId: string) => {
      return defaultMemoize((ecsCategory: string) => {
        const relatedById = relatedEventsByEntityId.get(entityId);
        // With no related events, we can't return related by category
        if (!relatedById) {
          return [];
        }
        return relatedById.events.reduce(
          (eventsByCategory: ResolverEvent[], candidate: ResolverEvent) => {
            if (
              [candidate && eventModel.allEventCategories(candidate)].flat().includes(ecsCategory)
            ) {
              eventsByCategory.push(candidate);
            }
            return eventsByCategory;
          },
          []
        );
      });
    });
  }
);

/**
 * returns a map of entity_ids to booleans indicating if it is waiting on related event
 * A value of `undefined` can be interpreted as `not yet requested`
 */
export function relatedEventsReady(data: DataState): Map<string, boolean> {
  return data.relatedEventsReady;
}

/**
 * `true` if there were more children than we got in the last request.
 */
export function hasMoreChildren(state: DataState): boolean {
  const resolverTree = resolverTreeResponse(state);
  return resolverTree ? resolverTreeModel.hasMoreChildren(resolverTree) : false;
}

/**
 * `true` if there were more ancestors than we got in the last request.
 */
export function hasMoreAncestors(state: DataState): boolean {
  const resolverTree = resolverTreeResponse(state);
  return resolverTree ? resolverTreeModel.hasMoreAncestors(resolverTree) : false;
}

interface RelatedInfoFunctions {
  shouldShowLimitForCategory: (category: string) => boolean;
  numberNotDisplayedForCategory: (category: string) => number;
  numberActuallyDisplayedForCategory: (category: string) => number;
}
/**
 * A map of `entity_id`s to functions that provide information about
 * related events by ECS `.category` Primarily to avoid having business logic
 * in UI components.
 */
export const relatedEventInfoByEntityId: (
  state: DataState
) => (entityID: string) => RelatedInfoFunctions | null = createSelector(
  relatedEventsByEntityId,
  relatedEventsStats,
  function selectLineageLimitInfo(
    /* eslint-disable no-shadow */
    relatedEventsByEntityId,
    relatedEventsStats
    /* eslint-enable no-shadow */
  ) {
    return (entityId) => {
      const stats = relatedEventsStats(entityId);
      if (!stats) {
        return null;
      }
      const eventsResponseForThisEntry = relatedEventsByEntityId.get(entityId);
      const hasMoreEvents =
        eventsResponseForThisEntry && eventsResponseForThisEntry.nextEvent !== null;
      /**
       * Get the "aggregate" total for the event category (i.e. _all_ events that would qualify as being "in category")
       * For a set like `[DNS,File][File,DNS][Registry]` The first and second events would contribute to the aggregate total for DNS being 2.
       * This is currently aligned with how the backed provides this information.
       *
       * @param eventCategory {string} The ECS category like 'file','dns',etc.
       */
      const aggregateTotalForCategory = (eventCategory: string): number => {
        return stats.events.byCategory[eventCategory] || 0;
      };

      /**
       * Get all the related events in the category provided.
       *
       * @param eventCategory {string} The ECS category like 'file','dns',etc.
       */
      const unmemoizedMatchingEventsForCategory = (eventCategory: string): ResolverEvent[] => {
        if (!eventsResponseForThisEntry) {
          return [];
        }
        return eventsResponseForThisEntry.events.filter((resolverEvent) => {
          for (const category of [eventModel.allEventCategories(resolverEvent)].flat()) {
            if (category === eventCategory) {
              return true;
            }
          }
          return false;
        });
      };

      const matchingEventsForCategory = unmemoizedMatchingEventsForCategory;

      /**
       * The number of events that occurred before the API limit was reached.
       * The number of events that came back form the API that have `eventCategory` in their list of categories.
       *
       * @param eventCategory {string} The ECS category like 'file','dns',etc.
       */
      const numberActuallyDisplayedForCategory = (eventCategory: string): number => {
        return matchingEventsForCategory(eventCategory)?.length || 0;
      };

      /**
       * The total number counted by the backend - the number displayed
       *
       * @param eventCategory {string} The ECS category like 'file','dns',etc.
       */
      const numberNotDisplayedForCategory = (eventCategory: string): number => {
        return (
          aggregateTotalForCategory(eventCategory) -
          numberActuallyDisplayedForCategory(eventCategory)
        );
      };

      /**
       * `true` when the `nextEvent` cursor appeared in the results and we are short on the number needed to
       * fullfill the aggregate count.
       *
       * @param eventCategory {string} The ECS category like 'file','dns',etc.
       */
      const shouldShowLimitForCategory = (eventCategory: string): boolean => {
        if (hasMoreEvents && numberNotDisplayedForCategory(eventCategory) > 0) {
          return true;
        }
        return false;
      };

      const entryValue = {
        shouldShowLimitForCategory,
        numberNotDisplayedForCategory,
        numberActuallyDisplayedForCategory,
      };
      return entryValue;
    };
  }
);

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

export const layout = createSelector(
  tree,
  originID,
  function processNodePositionsAndEdgeLineSegments(
    /* eslint-disable no-shadow */
    indexedProcessTree,
    originID
    /* eslint-enable no-shadow */
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
    const originPosition = isometricTaxiLayoutModel.nodePosition(taxiLayout, originNode);
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
) => (nodeID: string) => ResolverEvent | null = createSelector(
  tree,
  (indexedProcessTree) => (nodeID: string) =>
    indexedProcessTreeModel.processEvent(indexedProcessTree, nodeID) as ResolverEvent
);

/**
 * Takes a nodeID (aka entity_id) and returns the associated aria level as a number or null if the node ID isn't in the tree.
 */
export const ariaLevel: (state: DataState) => (nodeID: string) => number | null = createSelector(
  layout,
  processEventForID,
  ({ ariaLevels }, processEventGetter) => (nodeID: string) => {
    const node = processEventGetter(nodeID);
    return node ? ariaLevels.get(node as SafeResolverEvent) ?? null : null;
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
      const nodeEvent: ResolverEvent | null = eventGetter(nodeID);

      if (!nodeEvent) {
        // this should never happen.
        throw new Error('could not find child event in process tree.');
      }

      // nodes with the same parent ID
      const children = indexedProcessTreeModel.children(
        indexedProcessTree,
        uniqueParentPidForProcess(nodeEvent)
      );

      let previousChild: ResolverEvent | null = null;
      // Loop over all nodes that have the same parent ID (even if the parent ID is undefined or points to a node that isn't in the tree.)
      for (const child of children) {
        if (previousChild !== null) {
          // Set the `child` as the following sibling of `previousChild`.
          memo.set(uniquePidForProcess(previousChild), uniquePidForProcess(child as ResolverEvent));
        }
        // Set the child as the previous child.
        previousChild = child as ResolverEvent;
      }

      if (previousChild) {
        // if there is a previous child, it has no following sibling.
        memo.set(uniquePidForProcess(previousChild), null);
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
 * The sum of all related event categories for a process.
 */
export const relatedEventTotalForProcess: (
  state: DataState
) => (event: ResolverEvent) => number | null = createSelector(
  relatedEventsStats,
  (statsForProcess) => {
    return (event: ResolverEvent) => {
      const stats = statsForProcess(uniquePidForProcess(event));
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

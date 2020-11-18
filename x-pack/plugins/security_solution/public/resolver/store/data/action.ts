/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverRelatedEvents,
  ResolverTree,
  SafeEndpointEvent,
  SafeResolverEvent,
} from '../../../../common/endpoint/types';
import { TreeFetcherParameters } from '../../types';

interface ServerReturnedResolverData {
  readonly type: 'serverReturnedResolverData';
  readonly payload: {
    /**
     * The result of fetching data
     */
    result: ResolverTree;
    /**
     * The database parameters that was used to fetch the resolver tree
     */
    parameters: TreeFetcherParameters;
  };
}

interface AppRequestedResolverData {
  readonly type: 'appRequestedResolverData';
  /**
   * entity ID used to make the request.
   */
  readonly payload: TreeFetcherParameters;
}

interface UserRequestedAdditionalRelatedEvents {
  readonly type: 'userRequestedAdditionalRelatedEvents';
}

interface ServerFailedToReturnNodeEventsInCategory {
  readonly type: 'serverFailedToReturnNodeEventsInCategory';
  readonly payload: {
    /**
     * The cursor, if any, that can be used to retrieve more events.
     */
    cursor: string | null;
    /**
     * The nodeID that `events` are related to.
     */
    nodeID: string;
    /**
     * The category that `events` have in common.
     */
    eventCategory: string;
  };
}

interface ServerFailedToReturnResolverData {
  readonly type: 'serverFailedToReturnResolverData';
  /**
   * entity ID used to make the failed request
   */
  readonly payload: TreeFetcherParameters;
}

interface AppAbortedResolverDataRequest {
  readonly type: 'appAbortedResolverDataRequest';
  /**
   * entity ID used to make the aborted request
   */
  readonly payload: TreeFetcherParameters;
}

/**
 * When related events are returned from the server
 */
interface ServerReturnedRelatedEventData {
  readonly type: 'serverReturnedRelatedEventData';
  readonly payload: ResolverRelatedEvents;
}

interface ServerReturnedNodeEventsInCategory {
  readonly type: 'serverReturnedNodeEventsInCategory';
  readonly payload: {
    /**
     * Events with `event.category` that include `eventCategory` and that are related to `nodeID`.
     */
    events: SafeEndpointEvent[];
    /**
     * The cursor, if any, that can be used to retrieve more events.
     */
    cursor: string | null;
    /**
     * The nodeID that `events` are related to.
     */
    nodeID: string;
    /**
     * The category that `events` have in common.
     */
    eventCategory: string;
  };
}

/**
 * When events are returned for a set of graph nodes. For Endpoint graphs the events returned are process lifecycle events.
 */
interface ServerReturnedNodeData {
  readonly type: 'serverReturnedNodeData';
  readonly payload: {
    /**
     * A map of the node's ID to an array of events
     */
    nodeData: Map<string, SafeResolverEvent[]>;
    /**
     * The list of IDs that were originally sent to the server. This won't necessarily equal nodeData.keys() because
     * data could have been deleted in Elasticsearch since the original graph nodes were returned or the server's
     * API limit could have been reached.
     */
    requestedIDs: Set<string>;
    /**
     * A flag indicating that the server returned the same amount of data that we requested. In this case
     * we might be missing events for some of the requested node IDs. We'll mark those nodes in such a way
     * that we'll request their data in a subsequent request.
     */
    reachedLimit: boolean;
  };
}

/**
 * When the middleware kicks off the request for node data to the server.
 */
interface AppRequestingNodeData {
  readonly type: 'appRequestingNodeData';
  readonly payload: {
    /**
     * The list of IDs that will be sent to the server to retrieve data for.
     */
    requestedIDs: Set<string>;
  };
}

/**
 * When the server returns an error after the app requests node data for a set of nodes.
 */
interface ServerFailedToReturnNodeData {
  readonly type: 'serverFailedToReturnNodeData';
  readonly payload: {
    /**
     * The list of IDs that were sent to the server to retrieve data for.
     */
    requestedIDs: Set<string>;
  };
}

interface AppRequestedCurrentRelatedEventData {
  type: 'appRequestedCurrentRelatedEventData';
}

interface ServerFailedToReturnCurrentRelatedEventData {
  type: 'serverFailedToReturnCurrentRelatedEventData';
}

interface ServerReturnedCurrentRelatedEventData {
  readonly type: 'serverReturnedCurrentRelatedEventData';
  readonly payload: SafeResolverEvent;
}

export type DataAction =
  | ServerReturnedResolverData
  | ServerFailedToReturnResolverData
  | AppRequestedCurrentRelatedEventData
  | ServerReturnedCurrentRelatedEventData
  | ServerFailedToReturnCurrentRelatedEventData
  | ServerReturnedRelatedEventData
  | ServerReturnedNodeEventsInCategory
  | AppRequestedResolverData
  | UserRequestedAdditionalRelatedEvents
  | ServerFailedToReturnNodeEventsInCategory
  | AppAbortedResolverDataRequest
  | ServerReturnedNodeData
  | ServerFailedToReturnNodeData
  | AppRequestingNodeData;

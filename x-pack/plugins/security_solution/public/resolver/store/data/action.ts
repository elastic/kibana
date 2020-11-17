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
 * TODO:
 */
interface ServerReturnedNodeData {
  readonly type: 'serverReturnedNodeData';
  readonly payload: {
    renderTime: number;
    nodeData: Map<string, SafeResolverEvent[]>;
  };
}

/**
 * TODO:
 */
interface ServerRequestingNodeData {
  readonly type: 'serverRequestingNodeData';
  readonly payload: {
    requestedNodes: Set<string>;
  };
}

interface ServerFailedToReturnNodeData {
  readonly type: 'serverFailedToReturnNodeData';
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

interface AppReceivedNewViewPosition {
  readonly type: 'appReceivedNewViewPosition';
  readonly payload: {
    time: number;
  };
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
  | AppReceivedNewViewPosition;

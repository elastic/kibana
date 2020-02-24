/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface LegacyEndpointEvent {
  '@timestamp': Date;
  endgame: {
    event_type_full: string;
    event_subtype_full: string;
    unique_pid: number;
    unique_ppid: number;
    serial_event_id: number;
  };
  agent: {
    id: string;
    type: string;
  };
}

export interface EndpointEvent {
  '@timestamp': Date;
  event: {
    category: string;
    type: string;
    id: string;
  };
  endpoint: {
    process: {
      entity_id: string;
      parent: {
        entity_id: string;
      };
    };
  };
  agent: {
    type: string;
  };
}

export type ResolverEvent = EndpointEvent | LegacyEndpointEvent;

/**
 * This interface defines the path parameters for a resolver route.
 */
export interface ResolverPathParams {
  /**
   * a string of either the entity_id field of an event or the unique_pid of a legacy event.
   */
  id: string;
}

interface LegacyEndpointID {
  /**
   * a string of an endpoint ID (the `agent.id` field).
   * This should only be used when requesting legacy events.
   *
   * There are two different event types handled by resolver:
   *
   * Legacy
   * A legacy Entity ID is made up of the `agent.id` and `unique_pid` fields. The client will need to identify if
   * it's looking at a legacy event and use those fields when making requests to the backend. The
   * request would be /resolver/{id}?legacyEndpointID=<some uuid>and the {id} would be the unique_pid.
   *
   * Elastic Endpoint
   * When interacting with the new form of data the client doesn't need the legacyEndpointID because it's already a
   * part of the entityID in the new type of event. So for the same request the client would just hit resolver/{id}
   * and the {id} would be entityID stored in the event's process.entity_id field.
   */
  legacyEndpointID?: string;
}

/**
 * This interface defines the query params for the lifecycle resolver route.
 */
export interface ResolverLifecycleQueryParams extends LegacyEndpointID {
  /**
   * specifies the number of ancestors to retrieve lifecycle events for.
   */
  ancestors: number;
}

/**
 * This interface defines the query params for resolver routes that include pagination through an `after` cursor.
 */
export interface ResolverCursorPaginatedQueryParams extends LegacyEndpointID {
  /**
   * the cursor to request the next set of results for an API.
   */
  after?: string;
  /**
   * the size limit for the response from the resolver routes.
   */
  limit: number;
}

interface ResolverPagination {
  /**
   * This object holds a response's pagination information.
   */
  pagination: {
    /**
     * a number indicating the total number of documents found.
     * This is not the total of documents returned in a single request to the route but instead the total that the
     * client can expect to receive.
     */
    total: number;
    /**
     * a cursor that can be passed back to the route to receive the next set of documents.
     */
    next: string;
    /**
     * the echoed limit that the client requested (or the default).
     */
    limit: number;
  };
}

/**
 * This interface defines the response for the resolver related alerts route. This route returns alerts that are tied
 * to a specific process event.
 */
export interface ResolverAlertResults extends ResolverPagination {
  /**
   * an array of alerts.
   */
  alerts: ResolverEvent[];
}

interface Lifecycle {
  /**
   * an array of events describing the lifecycle for a process.
   */
  lifecycle: ResolverEvent[];
}

/**
 * This interface defines the response for the resolver lifecycle route. This route returns the lifecycle events for the
 * specified process event and the requested ancestors.
 */
export interface ResolverLifecycleResults extends Lifecycle {
  /**
   * an array holding each ancestor's lifecycle events.
   */
  ancestors: Lifecycle[];
  /**
   * pagination information.
   */
  pagination: {
    /**
     * either a string representing the `id` path param for the next lifecycle route request to retrieve the next set
     * of ancestors. Or null indicating there are not more ancestors to retrieve.
     */
    next: string | null;
    /**
     * echoed back ancestors query param in the request.
     */
    ancestors: number;
  };
}

/**
 * This interface defines the response for the resolver children route. This route returns the lifecycle events for the
 * children of a process event.
 */
export interface ResolverChildrenResults extends ResolverPagination {
  /**
   * an array holding each child's lifecycle events.
   */
  children: Lifecycle[];
}

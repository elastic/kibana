/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CameraAction } from './camera';
import { DataAction } from './data/action';

/**
 * When the user wants to bring a node front-and-center on the map.
 */
interface UserBroughtNodeIntoView {
  readonly type: 'userBroughtNodeIntoView';
  readonly payload: {
    /**
     * Used to identify the node that should be brought into view.
     */
    readonly nodeID: string;
    /**
     * The time (since epoch in milliseconds) when the action was dispatched.
     */
    readonly time: number;
  };
}

/**
 * The action dispatched when the app requests related event data for one
 * subject (whose entity_id should be included as `payload`)
 */
interface UserRequestedRelatedEventData {
  readonly type: 'userRequestedRelatedEventData';
  readonly payload: string;
}

/**
 * When the user switches the "active descendant" of the Resolver.
 * The "active descendant" (from the point of view of the parent element)
 * corresponds to the "current" child element. "active" or "current" here meaning
 * the element that is focused on by the user's interactions with the UI, but
 * not necessarily "selected" (see UserSelectedResolverNode below)
 */
interface UserFocusedOnResolverNode {
  readonly type: 'userFocusedOnResolverNode';

  /** focused nodeID */
  readonly payload: string;
}

/**
 * When the user "selects" a node in the Resolver
 * "Selected" refers to the state of being the element that the
 * user most recently "picked" (by e.g. pressing a button corresponding
 * to the element in a list) as opposed to "active" or "current" (see UserFocusedOnResolverNode above).
 */
interface UserSelectedResolverNode {
  readonly type: 'userSelectedResolverNode';
  /**
   * The nodeID (aka entity_id) that was select.
   */
  readonly payload: string;
}

/**
 * Used by `useStateSyncingActions` hook.
 * This is dispatched when external sources provide new parameters for Resolver.
 * When the component receives a new 'databaseDocumentID' prop, this is fired.
 */
interface AppReceivedNewExternalProperties {
  type: 'appReceivedNewExternalProperties';
  /**
   * Defines the externally provided properties that Resolver acknowledges.
   */
  payload: {
    /**
     * the `_id` of an ES document. This defines the origin of the Resolver graph.
     */
    databaseDocumentID: string;
    /**
     * An ID that uniquely identifies this Resolver instance from other concurrent Resolvers.
     */
    resolverComponentInstanceID: string;

    /**
     * The `search` part of the URL of this page.
     */
    locationSearch: string;

    /**
     * Indices that the backend will use to find the document.
     */
    indices: string[];
  };
}

export type ResolverAction =
  | CameraAction
  | DataAction
  | AppReceivedNewExternalProperties
  | UserBroughtNodeIntoView
  | UserFocusedOnResolverNode
  | UserSelectedResolverNode
  | UserRequestedRelatedEventData;

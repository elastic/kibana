/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CameraAction } from './camera';
import { DataAction } from './data';
import { ResolverEvent } from '../../../common/endpoint/types';

/**
 * When the user wants to bring a process node front-and-center on the map.
 */
interface UserBroughtProcessIntoView {
  readonly type: 'userBroughtProcessIntoView';
  readonly payload: {
    /**
     * Used to identify the process node that should be brought into view.
     */
    readonly process: ResolverEvent;
    /**
     * The time (since epoch in milliseconds) when the action was dispatched.
     */
    readonly time: number;
  };
}

/**
 * Dispatched to notify state that a different panel needs to be displayed
 */
interface AppDisplayedDifferentPanel {
  readonly type: 'appDisplayedDifferentPanel';
  /**
   * The name of the panel to display
   */
  readonly payload: string;
}

/**
 * When an examination of query params in the UI indicates that state needs to
 * be updated to reflect the new selection
 */
interface AppDetectedNewIdFromQueryParams {
  readonly type: 'appDetectedNewIdFromQueryParams';
  readonly payload: {
    /**
     * Used to identify the process the process that should be synced with state.
     */
    readonly process: ResolverEvent;
    /**
     * The time (since epoch in milliseconds) when the action was dispatched.
     */
    readonly time: number;
  };
}

/**
 * Used when the alert list selects an alert and the flyout shows resolver.
 */
interface UserChangedSelectedEvent {
  readonly type: 'userChangedSelectedEvent';
  readonly payload: {
    /**
     * Optional because they could have unselected the event.
     */
    readonly selectedEvent?: ResolverEvent;
  };
}

/**
 * Triggered by middleware when the data for resolver needs to be loaded. Used to set state in redux to 'loading'.
 */
interface AppRequestedResolverData {
  readonly type: 'appRequestedResolverData';
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
 * The action dispatched when the app requests related event data for one
 * subject (whose entity_id should be included as `payload`)
 */
interface AppDetectedMissingEventData {
  readonly type: 'appDetectedMissingEventData';
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
  readonly payload: {
    /**
     * Used to identify the process node that the user focused on (in the DOM)
     */
    readonly nodeId: string;
  };
}

/**
 * When the user "selects" a node in the Resolver
 * "Selected" refers to the state of being the element that the
 * user most recently "picked" (by e.g. pressing a button corresponding
 * to the element in a list) as opposed to "active" or "current" (see UserFocusedOnResolverNode above).
 */
interface UserSelectedResolverNode {
  readonly type: 'userSelectedResolverNode';
  readonly payload: {
    /**
     * The HTML ID used to identify the process node's element that the user selected
     */
    readonly nodeId: string;
    /**
     * The process entity_id for the process the node represents
     */
    readonly selectedProcessId: string;
  };
}

/**
 * This action should dispatch to indicate that the user chose to
 * focus on examining the related events of a particular ResolverEvent.
 * Optionally, this can be bound by a category of related events (e.g. 'file' or 'dns')
 */
interface UserSelectedRelatedEventCategory {
  readonly type: 'userSelectedRelatedEventCategory';
  readonly payload: {
    subject: ResolverEvent;
    category?: string;
  };
}

/**
 * This action should dispatch to indicate that the user chose to focus
 * on examining alerts related to a particular ResolverEvent
 */
interface UserSelectedRelatedAlerts {
  readonly type: 'userSelectedRelatedAlerts';
  readonly payload: ResolverEvent;
}

export type ResolverAction =
  | CameraAction
  | DataAction
  | UserBroughtProcessIntoView
  | UserChangedSelectedEvent
  | AppRequestedResolverData
  | UserFocusedOnResolverNode
  | UserSelectedResolverNode
  | UserRequestedRelatedEventData
  | UserSelectedRelatedEventCategory
  | UserSelectedRelatedAlerts
  | AppDetectedNewIdFromQueryParams
  | AppDisplayedDifferentPanel
  | AppDetectedMissingEventData;

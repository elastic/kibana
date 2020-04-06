/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CameraAction } from './camera';
import { DataAction } from './data';
import { ResolverEvent } from '../../../../common/types';

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
     * Used to identify the process node that the user selected
     */
    readonly nodeId: string;
  };
}

export type ResolverAction =
  | CameraAction
  | DataAction
  | UserBroughtProcessIntoView
  | UserChangedSelectedEvent
  | AppRequestedResolverData
  | UserFocusedOnResolverNode
  | UserSelectedResolverNode;

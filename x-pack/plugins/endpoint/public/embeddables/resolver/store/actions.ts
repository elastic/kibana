/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CameraAction } from './camera';
import { DataAction } from './data';
import { LegacyEndpointEvent } from '../../../../common/types';

/**
 * When the user wants to bring a process node front-and-center on the map.
 */
interface UserBroughtProcessIntoView {
  readonly type: 'userBroughtProcessIntoView';
  readonly payload: {
    /**
     * Used to identify the process node that should be brought into view.
     */
    readonly process: LegacyEndpointEvent;
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
    selectedEvent?: LegacyEndpointEvent;
  };
}

/**
 * Triggered by middleware when the data for resolver needs to be loaded. Used to set state in redux to 'loading'.
 */
interface AppRequestedResolverData {
  readonly type: 'appRequestedResolverData';
}

export type ResolverAction =
  | CameraAction
  | DataAction
  | UserBroughtProcessIntoView
  | UserChangedSelectedEvent
  | AppRequestedResolverData;

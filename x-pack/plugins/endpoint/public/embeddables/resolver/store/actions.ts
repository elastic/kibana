/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProcessEvent } from '../types';
import { CameraAction } from './camera';
import { DataAction } from './data';

/**
 * When the user wants to bring a process node front-and-center on the map.
 */
interface UserBroughtProcessIntoView {
  readonly type: 'userBroughtProcessIntoView';
  readonly payload: {
    /**
     * Used to identify the process node that should be brought into view.
     */
    readonly process: ProcessEvent;
    /**
     * The time (since epoch in milliseconds) when the action was dispatched.
     */
    readonly time: number;
  };
}

export type ResolverAction = CameraAction | DataAction | UserBroughtProcessIntoView;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProcessEvent } from '../types';
import { CameraAction } from './camera';
import { DataAction } from './data';

interface UserBroughtProcessIntoView {
  readonly type: 'userBroughtProcessIntoView';
  readonly payload: {
    readonly time: Date;
    readonly process: ProcessEvent;
  };
}

export type ResolverAction = CameraAction | DataAction | UserBroughtProcessIntoView;

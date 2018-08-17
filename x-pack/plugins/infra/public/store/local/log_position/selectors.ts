/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogPositionState } from './reducer';

export const selectTargetPosition = (state: LogPositionState) => state.targetPosition;

export const selectIsAutoReloading = (state: LogPositionState) =>
  state.updatePolicy.policy === 'interval';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import { State } from '../../../types';

export interface RecordedPayload {
  previousState: State;
  newState: State;
  change: Partial<State>;
  action: Action;
}

export interface RecordedAction extends RecordedPayload {
  id: string;
}

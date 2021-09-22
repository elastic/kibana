/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import { PolicyArtifactsState } from '../../../types';

export interface AssignedTrustedAppsListStateChanged
  extends Action<'assignedTrustedAppsListStateChanged'> {
  payload: PolicyArtifactsState['assignedList'];
}

/**
 * All of the possible actions for Trusted Apps under the Policy Details store
 */
export type PolicyTrustedAppsAction = AssignedTrustedAppsListStateChanged;

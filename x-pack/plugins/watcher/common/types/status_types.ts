/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ACTION_STATES, WATCH_STATES, WATCH_STATE_COMMENTS } from '../constants';

export interface ActionStatusModelEs {
  id: string;
  actionStatusJson: estypes.WatcherActionStatus;
  errors?: any; // TODO: Type this more strictly.
  lastCheckedRawFormat?: string; // Date e.g. '2017-03-01T20:55:49.679Z'
}

export interface ServerActionStatusModel {
  id: string;
  actionStatusJson: estypes.WatcherActionStatus;
  errors: any; // TODO: Type this more strictly.
  lastCheckedRawFormat?: string; // Date e.g. '2017-03-01T20:55:49.679Z'
  lastExecutionRawFormat?: string; // Date e.g. '2017-03-01T20:55:49.679Z'
  isLastExecutionSuccessful?: boolean;
  lastExecutionReason?: string;
  lastAcknowledged: Moment | null;
  lastExecution: Moment | null;
  lastThrottled: Moment | null;
  lastSuccessfulExecution: Moment | null;
}

export interface ClientActionStatusModel {
  id: string;
  lastAcknowledged: Moment | null;
  lastThrottled: Moment | null;
  lastExecution: Moment | null;
  isLastExecutionSuccessful?: boolean;
  lastExecutionReason?: string;
  lastSuccessfulExecution: Moment | null;
  state: keyof typeof ACTION_STATES;
  isAckable: boolean;
}

interface SerializedWatchStatus extends estypes.WatcherActivationStatus {
  // Inherited from estypes.WatcherActivationStatus:
  //  - actions: WatcherActions // Record<IndexName, WatcherActionStatus>
  //  - state: WatcherActivationState // { active, timestamp }
  //  - version: VersionNumber
  last_checked?: string; // Timestamp TODO: Update ES JS client types with this.
  last_met_condition?: string; // Timestamp TODO: Update ES JS client types with this.
}

export interface WatchStatusModelEs {
  id: string;
  watchStatusJson: SerializedWatchStatus;
  state?: estypes.WatcherExecutionStatus; // e.g. 'execution_not_needed' or 'failed'
  watchErrors?: {
    actions?: Record<string, any>; // TODO: Type this more strictly.
  };
}

export interface ServerWatchStatusModel {
  id: string;
  watchState?: estypes.WatcherExecutionStatus; // e.g. 'execution_not_needed' or 'failed'
  watchStatusJson: SerializedWatchStatus;
  watchErrors?: WatchStatusModelEs['watchErrors'];
  isActive: boolean;
  lastChecked: Moment | null;
  lastMetCondition: Moment | null;
  actionStatuses?: ServerActionStatusModel[];
}

export interface ClientWatchStatusModel {
  id: string;
  isActive: boolean;
  lastChecked: Moment | null;
  lastMetCondition: Moment | null;
  state: keyof typeof WATCH_STATES;
  comment: keyof typeof WATCH_STATE_COMMENTS;
  lastExecution?: Moment | null;
  actionStatuses: ClientActionStatusModel[];
}

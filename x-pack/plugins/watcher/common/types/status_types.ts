/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ACTION_STATES, WATCH_STATES } from '../constants';

export interface SerializedActionStatus {
  ack?: {
    timestamp: string;
    state: 'acked';
  };
  last_execution?: {
    timestamp: string;
    successful: boolean;
  };
  last_successful_execution?: {
    timestamp: string;
    successful: boolean;
  };
}

export interface SerializedWatchStatus extends estypes.WatcherActivationStatus {
  // version: number;
  // state: {
  //   active: boolean;
  //   timestamp: string;
  // };
  // actions: Record<string, SerializedActionStatus>;
  last_checked?: string;
  last_met_condition?: string;
}

export interface WatchStatusUpstreamJson {
  id: string;
  watchStatusJson: SerializedWatchStatus;
  state?: string; // e.g. 'execution_not_needed' or 'failed'
  watchErrors?: {
    actions?: Record<string, any>;
  };
}

export interface DeserializedActionStatusModel {
  lastExecution: number;
  state: keyof typeof ACTION_STATES;
  downstreamJson: any; // TODO
}

export interface ServerWatchStatusModel {
  id: string;
  watchState?: keyof typeof WATCH_STATES;
  watchStatusJson: SerializedWatchStatus;
  watchErrors?: WatchStatusUpstreamJson['watchErrors'];
  isActive: boolean;
  lastChecked: Moment | null;
  lastMetCondition: Moment | null;
  actionStatuses?: DeserializedActionStatusModel[];
}

// export interface WatchStatus {
//   id: string;
//   watchState: typeof WATCH_STATES;
//   state: {
//     active: boolean;
//     timestamp: string;
//   };
//   actions: Record<string, ActionStatus>;
//   version: number;
//   last_checked?: string;
//   last_met_condition?: string;
// }

/*
  json.watchStatusJson should have the following structure:
  {
    "state": {
      "active": true,
      "timestamp": "2017-03-01T19:05:49.400Z"
    },
    "actions": {
      "log-me-something": {
        "ack": {
          "timestamp": "2017-03-01T20:56:58.442Z",
          "state": "acked"
        },
        "last_execution": {
          "timestamp": "2017-03-01T20:55:49.679Z",
          "successful": true
        },
        "last_successful_execution": {
          "timestamp": "2017-03-01T20:55:49.679Z",
          "successful": true
        }
      }
    },
    "version": 15,
    "last_checked": "2017-03-02T14:25:31.139Z",
    "last_met_condition": "2017-03-02T14:25:31.139Z"
  }
  */

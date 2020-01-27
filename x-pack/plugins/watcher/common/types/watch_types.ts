/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ExecutedWatchResults {
  id: string;
  watchId: string;
  details: any;
  startTime: Date;
  watchStatus: {
    state: string;
    actionStatuses: Array<{ state: string; lastExecutionReason: string; id: string }>;
  };
}

export interface ExecutedWatchDetails {
  scheduledTimeValue: string | undefined;
  scheduledTimeUnit: string;
  triggeredTimeValue: string | undefined;
  triggeredTimeUnit: string;
  ignoreCondition: boolean;
  alternativeInput: any;
  actionModes: {
    [key: string]: string;
  };
  recordExecution: boolean;
  upstreamJson: any;
}

export interface BaseWatch {
  id: string;
  type: string;
  isNew: boolean;
  name: string;
  isSystemWatch: boolean;
  watchStatus: any;
  watchErrors: any;
  typeName: string;
  displayName: string;
  upstreamJson: any;
  resetActions: () => void;
  createAction: (type: string, actionProps: {}) => void;
  validate: () => { warning: { message: string; title?: string } };
  actions: [
    {
      id: string;
      type: string;
    }
  ];
  watch: {
    actions: {
      [key: string]: { [key: string]: any };
    };
  };
}

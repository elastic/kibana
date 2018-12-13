/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TimeRange {
  timerange: {
    type: 'absolute' | 'relative';
    from: number;
    to: number;
  };
  policy: {
    type: 'manual' | 'interval';
    interval: number;
    intervalType: string;
  };
}

export interface InputsModel {
  kql: TimeRange;
}

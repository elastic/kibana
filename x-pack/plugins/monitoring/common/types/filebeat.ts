/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FilebeatResponse {
  hits?: {
    hits: FilebeatResponseHit[];
    total: {
      value: number;
    };
  };
  aggregations?: any;
}

export interface FilebeatResponseHit {
  _source: {
    message?: string;
    log?: {
      level?: string;
    };
    '@timestamp': string;
    event?: {
      dataset?: string;
    };
    elasticsearch?: {
      component?: string;
      index?: {
        name?: string;
      };
      node?: {
        name?: string;
      };
    };
  };
}

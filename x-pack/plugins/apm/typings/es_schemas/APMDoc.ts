/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface APMDocV1 {
  '@timestamp': string;
  beat: {
    hostname: string;
    name: string;
    version: string;
  };
  host: {
    name: string;
  };
  agent?: object;
}

export interface APMDocV2 extends APMDocV1 {
  timestamp: {
    us: number;
  };
  parent?: {
    id: string; // parent ID is not available on the root transaction
  };
  trace: {
    id: string;
  };
}

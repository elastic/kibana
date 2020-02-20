/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// all documents types extend APMBaseDoc and inherit all properties
export interface APMBaseDoc {
  '@timestamp': string;
  agent: {
    name: string;
    version: string;
  };
  timestamp: { us: number };
  parent?: { id: string }; // parent ID is not available on root transactions
  trace?: { id: string };
  labels?: {
    [key: string]: string | number | boolean;
  };
  [key: string]: unknown;
}

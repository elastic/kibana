/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface APMDoc {
  '@timestamp': string;
  agent: {
    name: string;
    version: string;
  };

  // TODO: Is http on both spans, transactions and errors?
  http?: {
    request: { method: string };
    response: { status_code: number };
  };
  service: {
    name: string;
    framework?: {
      name: string;
      version: string;
    };
    runtime?: {
      name: string;
      version: string;
    };
    language?: {
      name: string;
      version?: string;
    };
    [key: string]: unknown;
  };
  timestamp: { us: number };
  parent?: { id: string }; // parent ID is not available on the root transaction
  trace: { id: string };
  labels?: {
    [key: string]: unknown;
  };
}

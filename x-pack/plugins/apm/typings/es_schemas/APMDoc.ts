/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Context {
  page?: {
    url: string;
  };
  [key: string]: unknown;
}

export interface APMDoc {
  '@timestamp': string;
  host?: {
    architecture?: string;
    hostname?: string;
    ip?: string;
    os?: {
      platform?: string;
    };
  };
  agent: {
    name: string;
    version: string;
  };
  url?: {
    full: string;
  };
  http?: {
    request: {
      method: string;
    };
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
  process?: {
    pid: number;
    title: string;
    argv: string[];
    [key: string]: unknown;
  };
  timestamp: {
    us: number;
  };
  parent?: {
    id: string; // parent ID is not available on the root transaction
  };
  trace: {
    id: string;
  };
  user?: {
    id: string;
    username?: string;
    email?: string;
  };
  context?: Context;
}

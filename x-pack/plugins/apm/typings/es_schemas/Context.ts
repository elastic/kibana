/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ContextService {
  name: string;
  agent: {
    name: string;
    version: string;
  };
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
}

export interface ContextSystem {
  architecture?: string;
  hostname?: string;
  ip?: string;
  platform?: string;
}

export interface ContextRequest {
  url: {
    full: string;
    [key: string]: string;
  };
  method: string;
  headers?: {
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ContextProcess {
  pid: number;
  title: string;
  argv: string[];
  [key: string]: unknown;
}

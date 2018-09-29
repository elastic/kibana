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
}

export interface Stackframe {
  filename: string;
  line: {
    number: number;
    column?: number;
    context?: string;
  };
  abs_path?: string;
  colno?: number;
  context_line?: string;
  function?: string;
  library_frame?: boolean;
  exclude_from_grouping?: boolean;
  module?: string;
  context?: {
    post?: string[];
    pre?: string[];
  };
  sourcemap?: {
    updated?: boolean;
    error?: string;
  };
  vars?: any;
  orig?: {
    filename?: string;
    abs_path?: string;
    function?: string;
    lineno?: number;
    colno?: number;
  };
}

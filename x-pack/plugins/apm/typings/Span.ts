/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface DbContext {
  statement: string;
  type: string;
  user: string;
}

interface Stackframe {
  abs_path: string;
  colno: number;
  context_line: string;
  filename: string;
  function: string;
  library_frame: boolean;
  lineno: number;
  module: string;
  post_context: string[];
  pre_context: string[];
  vars: any;
}

interface Context {
  process?: {
    pid: string;
  };
  db?: DbContext;
  service: {
    name: string;
    agent: {
      version: string;
      name: string;
    };
  };
}

interface Span {
  '@timestamp': string;
  beat: {
    version: string;
    name: string;
    hostname: string;
  };
  context: Context;
  host: {
    name: string;
  };
  parent: {
    id: string;
  };
  processor: {
    name: 'transaction';
    event: 'span';
  };
  span: {
    duration: {
      us: number;
    };
    hex_id: string;
    name: string;
    parent: string;
    stacktrace: Stackframe[];
    start: {
      us: number;
    };
    type: string;
  };
  trace: {
    id: string;
  };
  transaction: {
    id: string;
  };
}

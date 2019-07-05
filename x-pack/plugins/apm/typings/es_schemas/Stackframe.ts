/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface IStackframeBase {
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
  vars?: {
    [key: string]: unknown;
  };
  orig?: {
    filename?: string;
    abs_path?: string;
    function?: string;
    lineno?: number;
    colno?: number;
  };
}

interface IStackframeWithoutLineContext extends IStackframeBase {
  line: {
    number: number;
    column?: number;
    context: undefined;
  };
}

export interface IStackframeWithLineContext extends IStackframeBase {
  line: {
    number: number;
    column?: number;
    context: string;
  };
}

export type IStackframe =
  | IStackframeWithoutLineContext
  | IStackframeWithLineContext;

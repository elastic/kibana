/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface Line {
  column?: number;
  number: number;
}

interface Sourcemap {
  error?: string;
  updated?: boolean;
}

interface StackframeBase {
  abs_path?: string;
  classname?: string;
  context?: {
    post?: string[];
    pre?: string[];
  };
  exclude_from_grouping?: boolean;
  filename?: string;
  function?: string;
  module?: string;
  library_frame?: boolean;
  line?: Line;
  sourcemap?: Sourcemap;
  vars?: {
    [key: string]: unknown;
  };
}

export type StackframeWithLineContext = StackframeBase & {
  line: Line & {
    context: string;
  };
};

export type Stackframe = StackframeBase | StackframeWithLineContext;

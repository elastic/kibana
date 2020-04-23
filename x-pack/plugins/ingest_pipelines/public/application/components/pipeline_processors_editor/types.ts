/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESCommonProcessorOptions } from '../../../../common/types';

export interface DraggableLocation {
  index: number;
  /**
   * A '.' separated string value that indicates the path in an "n"
   * nested structure.
   *
   * For instance:
   * 'a.b.0.c' given { a: { b: [ { c: [] } ] } } => []
   */
  pathSelector: string;
}

export type ProcessorOptions<CustomProcessorOptions = {}> = ESCommonProcessorOptions &
  CustomProcessorOptions;

/** @private */
export interface ProcessorInternal<CustomProcessorOptions = {}> {
  readonly id: string;
  type: string;
  options: ProcessorOptions<CustomProcessorOptions>;
  onFailure?: ProcessorInternal[];
}

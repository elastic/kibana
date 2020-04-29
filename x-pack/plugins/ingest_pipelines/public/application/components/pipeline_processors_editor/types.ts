/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESCommonProcessorOptions } from '../../../../common/types';

/**
 * An array of keys that map to a value in an object
 * structure.
 *
 * For instance:
 * ['a', 'b', '0', 'c'] given { a: { b: [ { c: [] } ] } } => []
 *
 * Additionally, an empty selector `[]`, is a special indicator
 * for the root level.
 */
export type ProcessorSelector = string[];

export interface DraggableLocation {
  index: number;
  selector: ProcessorSelector;
}

export type ProcessorOptions<CustomProcessorOptions = {}> = ESCommonProcessorOptions &
  CustomProcessorOptions;

/** @private */
export interface ProcessorInternal<CustomProcessorOptions = {}> {
  type: string;
  options: ProcessorOptions<CustomProcessorOptions>;
  onFailure?: ProcessorInternal[];
}

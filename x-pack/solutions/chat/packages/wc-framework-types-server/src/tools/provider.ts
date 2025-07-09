/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import { Tool } from './tool';

/**
 * Represents a tool provider exposed to a workflow to let it call tools.
 *
 * Tool providers can be either sync or async, to adapt to potential remote implementations.
 */
export interface ToolProvider {
  /**
   * Checks if the registry contains a tool for this ID.
   */
  has(id: string): MaybePromise<boolean>;
  /**
   * Returns a tool based on its ID
   *
   * Will throw if no entries are found for the given id.
   */
  get(id: string): MaybePromise<Tool>;
  /**
   * Returns all tools that are registered in that registry.
   */
  getAll(): MaybePromise<Tool[]>;
}

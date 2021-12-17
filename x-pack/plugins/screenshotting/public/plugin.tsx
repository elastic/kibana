/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'src/core/public';
import { ContextStorage } from './context_storage';

/**
 * Setup public contract.
 */
export interface ScreenshottingSetup {
  /**
   * Gathers screenshot context that has been set on the backend.
   */
  getContext: ContextStorage['get'];
}

/**
 * Start public contract.
 */
export type ScreenshottingStart = ScreenshottingSetup;

export class ScreenshottingPlugin implements Plugin<ScreenshottingSetup, ScreenshottingStart> {
  private contextStorage = new ContextStorage();

  setup(): ScreenshottingSetup {
    return {
      getContext: () => this.contextStorage.get(),
    };
  }

  start(): ScreenshottingStart {
    return {
      getContext: () => this.contextStorage.get(),
    };
  }

  stop() {}
}

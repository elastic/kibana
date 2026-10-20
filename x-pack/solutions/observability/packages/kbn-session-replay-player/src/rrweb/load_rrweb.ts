/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { canvasMutation, Replayer } from 'rrweb';

/** The parts of rrweb the player uses. */
export interface RrwebModule {
  Replayer: typeof Replayer;
  canvasMutation: typeof canvasMutation;
}

let pending: Promise<RrwebModule> | undefined;

/**
 * Loads rrweb and its stylesheet the first time a player needs them, so neither enters a page-load
 * bundle. Every caller shares one load; a failed load can be retried.
 */
export const loadRrweb = (): Promise<RrwebModule> => {
  if (!pending) {
    pending = Promise.all([import('rrweb'), import('rrweb/dist/style.css')])
      .then(([module]) => ({
        Replayer: module.Replayer,
        canvasMutation: module.canvasMutation,
      }))
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
  }
  return pending;
};

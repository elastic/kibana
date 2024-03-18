/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogDebugMessage } from './log_debug_message';
import type { StateHandler } from './state_handler';

/**
 * Helper function that will check if the actual stream is still running
 * and only then will call the callback to end the raw stream and update its state.
 * This is implemented as a factory that receives the necessary dependencies
 * which then returns the actual helper function.
 */
export const streamEndFactory = (
  stateHandler: StateHandler,
  streamEndCallback: () => void,
  logDebugMessage: LogDebugMessage
) => {
  return function end() {
    if (stateHandler.isRunning()) {
      stateHandler.isRunning(false);
      logDebugMessage('Ending analysis.');
      streamEndCallback();
    } else {
      logDebugMessage('end() was called again with isRunning already being false.');
    }
  };
};

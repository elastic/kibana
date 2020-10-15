/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ACTION_MODES: { [key: string]: string } = {
  // The action execution will be simulated. For example, The email action will create the email that would have been sent but will not actually send it. In this mode, the action may be throttled if the current state of the watch indicates it should be.
  SIMULATE: 'simulate',

  // Similar to the the simulate mode, except the action will not be throttled even if the current state of the watch indicates it should be.
  FORCE_SIMULATE: 'force_simulate',

  // Executes the action as it would have been executed if the watch would have been triggered by its own trigger. The execution may be throttled if the current state of the watch indicates it should be.
  EXECUTE: 'execute',

  // Similar to the execute mode, except the action will not be throttled even if the current state of the watch indicates it should be.
  FORCE_EXECUTE: 'force_execute',

  // The action will be skipped and won’t be executed nor simulated. Effectively forcing the action to be throttled.
  SKIP: 'skip',
};

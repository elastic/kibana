/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const RESPONSE_ACTION_STATUS = ['failed', 'pending', 'successful'] as const;
export type ResponseActionStatus = typeof RESPONSE_ACTION_STATUS[number];

export const RESPONSE_ACTION_COMMANDS = [
  'isolate',
  'unisolate',
  'kill-process',
  'suspend-process',
  'running-processes',
  'get-file',
] as const;
export type ResponseActions = typeof RESPONSE_ACTION_COMMANDS[number];

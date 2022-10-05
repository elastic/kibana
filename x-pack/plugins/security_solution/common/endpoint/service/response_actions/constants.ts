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

/**
 * The list of possible capabilities, reported by the endpoint in the metadata document
 */
export const RESPONDER_CAPABILITIES = [
  'isolation',
  'kill_process',
  'suspend_process',
  'running_processes',
] as const;

export type ResponderCapabilities = typeof RESPONDER_CAPABILITIES[number];

/** The list of possible responder command names **/
export const RESPONDER_COMMANDS = [
  'isolate',
  'release',
  'kill-process',
  'suspend-process',
  'processes',
] as const;

export type ResponderCommands = typeof RESPONDER_COMMANDS[number];

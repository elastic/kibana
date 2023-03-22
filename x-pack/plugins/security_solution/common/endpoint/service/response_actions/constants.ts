/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const RESPONSE_ACTION_STATUS = ['failed', 'pending', 'successful'] as const;
export type ResponseActionStatus = typeof RESPONSE_ACTION_STATUS[number];

/**
 * The Command names that are used in the API payload for the `{ command: '' }` attribute
 */
export const RESPONSE_ACTION_API_COMMANDS_NAMES = [
  'isolate',
  'unisolate',
  'kill-process',
  'suspend-process',
  'running-processes',
  'get-file',
  'execute',
] as const;

export type ResponseActionsApiCommandNames = typeof RESPONSE_ACTION_API_COMMANDS_NAMES[number];

export const ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS: ResponseActionsApiCommandNames[] = [
  'isolate',
];

/**
 * The list of possible capabilities, reported by the endpoint in the metadata document
 */
export const ENDPOINT_CAPABILITIES = [
  'isolation',
  'kill_process',
  'suspend_process',
  'running_processes',
  'get_file',
  'execute',
] as const;

export type EndpointCapabilities = typeof ENDPOINT_CAPABILITIES[number];

/**
 * The list of possible console command names that generate a Response Action to be dispatched
 * to the Endpoint. (FYI: not all console commands are response actions)
 */
export const CONSOLE_RESPONSE_ACTION_COMMANDS = [
  'isolate',
  'release',
  'kill-process',
  'suspend-process',
  'processes',
  'get-file',
  'execute',
] as const;

export type ConsoleResponseActionCommands = typeof CONSOLE_RESPONSE_ACTION_COMMANDS[number];

export type ResponseConsoleRbacControls =
  | 'writeHostIsolation'
  | 'writeProcessOperations'
  | 'writeFileOperations'
  | 'writeExecuteOperations';

/**
 * maps the console command to the RBAC control that is required to access it via console
 */
export const commandToRBACMap: Record<ConsoleResponseActionCommands, ResponseConsoleRbacControls> =
  Object.freeze({
    isolate: 'writeHostIsolation',
    release: 'writeHostIsolation',
    'kill-process': 'writeProcessOperations',
    'suspend-process': 'writeProcessOperations',
    processes: 'writeProcessOperations',
    'get-file': 'writeFileOperations',
    execute: 'writeExecuteOperations',
  });

// 4 hrs in milliseconds
// 4 * 60 * 60 * 1000
export const DEFAULT_EXECUTE_ACTION_TIMEOUT = 14400000;

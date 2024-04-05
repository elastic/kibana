/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EndpointAuthzKeyList } from '../../types/authz';

export const RESPONSE_ACTION_STATUS = ['failed', 'pending', 'successful'] as const;
export type ResponseActionStatus = typeof RESPONSE_ACTION_STATUS[number];

export const RESPONSE_ACTION_TYPE = ['automated', 'manual'] as const;
export type ResponseActionType = typeof RESPONSE_ACTION_TYPE[number];

export const RESPONSE_ACTION_AGENT_TYPE = ['endpoint', 'sentinel_one', 'crowdstrike'] as const;
export type ResponseActionAgentType = typeof RESPONSE_ACTION_AGENT_TYPE[number];

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
  'upload',
] as const;

export type ResponseActionsApiCommandNames = typeof RESPONSE_ACTION_API_COMMANDS_NAMES[number];

export const ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS: ResponseActionsApiCommandNames[] = [
  'isolate',
  // TODO: TC- Uncomment these when we go GA with automated process actions
  // 'kill-process',
  // 'suspend-process'
];

export type EnabledAutomatedResponseActionsCommands =
  typeof ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS[number];

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
  'upload_file',
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
  'upload',
] as const;

export type ConsoleResponseActionCommands = typeof CONSOLE_RESPONSE_ACTION_COMMANDS[number];

export type ResponseConsoleRbacControls =
  | 'writeHostIsolation'
  | 'writeHostIsolationRelease'
  | 'writeProcessOperations'
  | 'writeFileOperations'
  | 'writeExecuteOperations';

/**
 * maps the console command to the RBAC control (kibana feature control) that is required to access it via console
 */
export const RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL: Record<
  ConsoleResponseActionCommands,
  ResponseConsoleRbacControls
> = Object.freeze({
  isolate: 'writeHostIsolation',
  release: 'writeHostIsolationRelease',
  'kill-process': 'writeProcessOperations',
  'suspend-process': 'writeProcessOperations',
  processes: 'writeProcessOperations',
  'get-file': 'writeFileOperations',
  execute: 'writeExecuteOperations',
  upload: 'writeFileOperations',
});

export const RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP = Object.freeze<
  Record<ResponseActionsApiCommandNames, ConsoleResponseActionCommands>
>({
  isolate: 'isolate',
  unisolate: 'release',
  execute: 'execute',
  'get-file': 'get-file',
  'running-processes': 'processes',
  'kill-process': 'kill-process',
  'suspend-process': 'suspend-process',
  upload: 'upload',
});

export const RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP = Object.freeze<
  Record<ConsoleResponseActionCommands, ResponseActionsApiCommandNames>
>({
  isolate: 'isolate',
  release: 'unisolate',
  execute: 'execute',
  'get-file': 'get-file',
  processes: 'running-processes',
  'kill-process': 'kill-process',
  'suspend-process': 'suspend-process',
  upload: 'upload',
});

export const RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY = Object.freeze<
  Record<ConsoleResponseActionCommands, EndpointCapabilities>
>({
  isolate: 'isolation',
  release: 'isolation',
  execute: 'execute',
  'get-file': 'get_file',
  processes: 'running_processes',
  'kill-process': 'kill_process',
  'suspend-process': 'suspend_process',
  upload: 'upload_file',
});

/**
 * The list of console commands mapped to the required EndpointAuthz to access that command
 */
export const RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ = Object.freeze<
  Record<ConsoleResponseActionCommands, EndpointAuthzKeyList[number]>
>({
  isolate: 'canIsolateHost',
  release: 'canUnIsolateHost',
  execute: 'canWriteExecuteOperations',
  'get-file': 'canWriteFileOperations',
  upload: 'canWriteFileOperations',
  processes: 'canGetRunningProcesses',
  'kill-process': 'canKillProcess',
  'suspend-process': 'canSuspendProcess',
});

// 4 hrs in seconds
// 4 * 60 * 60
export const DEFAULT_EXECUTE_ACTION_TIMEOUT = 14400;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EndpointAuthzKeyList } from '../../types/authz';

export const RESPONSE_ACTION_STATUS = ['failed', 'pending', 'successful'] as const;
export type ResponseActionStatus = (typeof RESPONSE_ACTION_STATUS)[number];

export const RESPONSE_ACTION_TYPE = ['automated', 'manual'] as const;
export type ResponseActionType = (typeof RESPONSE_ACTION_TYPE)[number];

export const RESPONSE_ACTION_AGENT_TYPE = ['endpoint', 'sentinel_one', 'crowdstrike'] as const;
export type ResponseActionAgentType = (typeof RESPONSE_ACTION_AGENT_TYPE)[number];

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
  'scan',
  'init',
  'shell',
] as const;

export type ResponseActionsApiCommandNames = (typeof RESPONSE_ACTION_API_COMMANDS_NAMES)[number];

export const ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS: ResponseActionsApiCommandNames[] = [
  'isolate',
  // TODO: TC- Uncomment these when we go GA with automated process actions
  // 'kill-process',
  // 'suspend-process'
];

export type EnabledAutomatedResponseActionsCommands =
  (typeof ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS)[number];

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
  'scan',
  'init',
  'shell',
] as const;

export type EndpointCapabilities = (typeof ENDPOINT_CAPABILITIES)[number];

/**
 * The list of possible console command names that generate a Response Action to be dispatched
 * to the Endpoint. (FYI: not all console commands are response actions)
 */
export const CONSOLE_RESPONSE_ACTION_COMMANDS = [
  'isolate',
  'release',
  'processes',
  'kill-process',
  'suspend-process',
  'get-file',
  'execute',
  'upload',
  'scan',
  'init',
  'shell',
] as const;

export type ConsoleResponseActionCommands = (typeof CONSOLE_RESPONSE_ACTION_COMMANDS)[number];

export type ResponseConsoleRbacControls =
  | 'writeHostIsolation'
  | 'writeHostIsolationRelease'
  | 'writeProcessOperations'
  | 'writeFileOperations'
  | 'writeExecuteOperations'
  | 'writeScanOperations';

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
  scan: 'writeScanOperations',
  init: 'writeExecuteOperations',
  shell: 'writeExecuteOperations',
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
  scan: 'scan',
  init: 'init',
  shell: 'shell',
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
  scan: 'scan',
  init: 'init',
  shell: 'shell',
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
  scan: 'scan',
  init: 'init',
  shell: 'shell',
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
  scan: 'canWriteScanOperations',
  init: 'canWriteExecuteOperations',
  shell: 'canWriteExecuteOperations',
});

// 4 hrs in seconds
// 4 * 60 * 60
export const DEFAULT_EXECUTE_ACTION_TIMEOUT = 14400;

/**
 * The passcodes used for accessing the content of a zip file (ex. from a `get-file` response action)
 */
export const RESPONSE_ACTIONS_ZIP_PASSCODE: Readonly<Record<ResponseActionAgentType, string>> =
  Object.freeze({
    endpoint: 'elastic',
    sentinel_one: 'Elastic@123',
    crowdstrike: 'tbd..',
  });

/**
 * Map of Agent Type to alert fields that holds the Agent ID for that agent type.
 * Multiple alert fields are supported since different data sources define the agent
 * id in different paths.
 *
 * NOTE:  there are utilities in `x-pack/plugins/security_solution/public/common/lib/endpoint/utils`
 *        that facilitate working with alert (ECS) fields to determine if the give event/alert supports
 *        response actions, including:
 *        - `getAgentTypeForAgentIdField()`
 *        - `getEventDetailsAgentIdField()`
 *        - `isResponseActionsAlertAgentIdField()`
 */
export const RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS: Readonly<
  Record<ResponseActionAgentType, string[]>
> = Object.freeze({
  endpoint: ['agent.id'],
  sentinel_one: [
    'sentinel_one.alert.agent.id',
    'sentinel_one.threat.agent.id',
    'sentinel_one.activity.agent.id',
    'sentinel_one.agent.agent.id',
  ],
  crowdstrike: ['device.id'],
});

export const SUPPORTED_AGENT_ID_ALERT_FIELDS: Readonly<string[]> = Object.values(
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS
).flat();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConsoleResponseActionCommands,
  EndpointCapabilities,
  ResponseActionsApiCommandNames,
} from '../service/response_actions/constants';
import type { EndpointPrivileges } from '../types';

export const commandToCapabilitiesPrivilegesMap = new Map<
  ConsoleResponseActionCommands,
  { capability: EndpointCapabilities; privilege: (privileges: EndpointPrivileges) => boolean }
>([
  [
    'isolate',
    {
      capability: 'isolation',
      privilege: (privileges: EndpointPrivileges) => privileges.canIsolateHost,
    },
  ],
  [
    'release',
    {
      capability: 'isolation',
      privilege: (privileges: EndpointPrivileges) => privileges.canUnIsolateHost,
    },
  ],
  [
    'kill-process',
    {
      capability: 'kill_process',
      privilege: (privileges: EndpointPrivileges) => privileges.canKillProcess,
    },
  ],
  [
    'suspend-process',
    {
      capability: 'suspend_process',
      privilege: (privileges: EndpointPrivileges) => privileges.canSuspendProcess,
    },
  ],
  [
    'processes',
    {
      capability: 'running_processes',
      privilege: (privileges: EndpointPrivileges) => privileges.canGetRunningProcesses,
    },
  ],
  [
    'get-file',
    {
      capability: 'get_file',
      privilege: (privileges: EndpointPrivileges) => privileges.canWriteFileOperations,
    },
  ],
  [
    'execute',
    {
      capability: 'execute',
      privilege: (privileges: EndpointPrivileges) => privileges.canWriteExecuteOperations,
    },
  ],
]);

export const getRbacControl = ({
  commandName,
  privileges,
}: {
  commandName: ConsoleResponseActionCommands;
  privileges: EndpointPrivileges;
}): boolean => {
  return Boolean(commandToCapabilitiesPrivilegesMap.get(commandName)?.privilege(privileges));
};

/**
 * map actual command to ui command
 * unisolate -> release
 * running-processes -> processes
 */
export const getUiCommand = (
  command: ResponseActionsApiCommandNames
): ConsoleResponseActionCommands => {
  if (command === 'unisolate') {
    return 'release';
  } else if (command === 'running-processes') {
    return 'processes';
  } else {
    return command;
  }
};

/**
 * map UI command back to actual command
 * release -> unisolate
 * processes -> running-processes
 */
export const getCommandKey = (
  uiCommand: ConsoleResponseActionCommands
): ResponseActionsApiCommandNames => {
  if (uiCommand === 'release') {
    return 'unisolate';
  } else if (uiCommand === 'processes') {
    return 'running-processes';
  } else {
    return uiCommand;
  }
};

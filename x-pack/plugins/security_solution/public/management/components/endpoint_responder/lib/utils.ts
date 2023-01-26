/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ConsoleResponseActionCommands,
  EndpointCapabilities,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type {
  EndpointPrivileges,
  ResponseActionParametersWithPidOrEntityId,
} from '../../../../../common/endpoint/types';
export const parsedPidOrEntityIdParameter = (parameters: {
  pid?: string[];
  entityId?: string[];
}): ResponseActionParametersWithPidOrEntityId => {
  if (parameters.pid) {
    return { pid: Number(parameters.pid[0]) };
  }

  return {
    entity_id: parameters?.entityId?.[0] ?? '',
  };
};

export const commandToCapabilitiesMap = new Map<
  ConsoleResponseActionCommands,
  EndpointCapabilities
>([
  ['isolate', 'isolation'],
  ['release', 'isolation'],
  ['kill-process', 'kill_process'],
  ['suspend-process', 'suspend_process'],
  ['processes', 'running_processes'],
  ['get-file', 'get_file'],
]);

export const getRbacControl = ({
  commandName,
  privileges,
}: {
  commandName: ConsoleResponseActionCommands;
  privileges: EndpointPrivileges;
}): boolean => {
  const commandToPrivilegeMap = new Map<ConsoleResponseActionCommands, boolean>([
    ['isolate', privileges.canIsolateHost],
    ['release', privileges.canUnIsolateHost],
    ['kill-process', privileges.canKillProcess],
    ['suspend-process', privileges.canSuspendProcess],
    ['processes', privileges.canGetRunningProcesses],
    ['get-file', privileges.canWriteFileOperations],
  ]);
  return commandToPrivilegeMap.get(commandName as ConsoleResponseActionCommands) ?? false;
};

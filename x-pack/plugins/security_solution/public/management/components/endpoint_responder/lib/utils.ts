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
import type { ResponseActionParametersWithPidOrEntityId } from '../../../../../common/endpoint/types';
import type { EndpointPrivileges } from '../../../../../common/endpoint/types';

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

const UNIT_TO_MILLISECONDS = (value: number) => ({
  h: (): number => value * 60 * 60 * 1000,
  m: (): number => value * 60 * 1000,
  s: (): number => value * 1000,
});

const convertToMilliseconds = (value: number, unit: 'h' | 'm' | 's'): number =>
  UNIT_TO_MILLISECONDS(value)[unit]();

const EXECUTE_TIMEOUT_REGEX = /^\d+(?=(h|m|s){1}$)/;
export const validateUnitOfTime = (value: string): boolean => EXECUTE_TIMEOUT_REGEX.test(value);

export const parsedExecuteTimeout = (timeout?: string): undefined | number => {
  const timeoutMatch = timeout?.trim().match(EXECUTE_TIMEOUT_REGEX);
  if (!timeoutMatch) {
    return;
  }

  return convertToMilliseconds(Number(timeoutMatch[0]), timeoutMatch[1] as 'h' | 'm' | 's');
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
  ['execute', 'execute'],
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
    ['execute', privileges.canWriteExecuteOperations],
  ]);
  return commandToPrivilegeMap.get(commandName as ConsoleResponseActionCommands) ?? false;
};

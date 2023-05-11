/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConsoleResponseActionCommands,
  ResponseActionsApiCommandNames,
} from '../service/response_actions/constants';
import { RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ } from '../service/response_actions/constants';
import type { EndpointPrivileges } from '../types';

export const getRbacControl = ({
  commandName,
  privileges,
}: {
  commandName: ConsoleResponseActionCommands;
  privileges: EndpointPrivileges;
}): boolean => {
  return Boolean(privileges[RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[commandName]]);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { Console } from './console';
export { ConsoleManager, useConsoleManager } from './components/console_manager';
export type {
  CommandDefinition,
  Command,
  ConsoleProps,
  CommandExecutionComponentProps,
} from './types';
export type {
  ConsoleRegistrationInterface,
  ManagedConsoleExtensionComponentProps,
  RegisteredConsoleClient,
  ConsoleManagerClient,
} from './components/console_manager/types';
export type {
  CommandExecutionResultProps,
  CommandExecutionResultComponent,
} from './components/command_execution_result';

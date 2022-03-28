/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { CommandDefinition, CommandServiceInterface } from '../types';
import { ParsedCommandInput } from './parsed_command_input';
import { HistoryItemComponent } from '../components/history_item';

export interface BuiltinCommandServiceInterface extends CommandServiceInterface {
  executeBuiltinCommand(
    parsedInput: ParsedCommandInput,
    contextConsoleService: CommandServiceInterface
  ): { result: ReturnType<HistoryItemComponent> | null; clearBuffer?: boolean };

  getHelpContent(
    parsedInput: ParsedCommandInput,
    commandService: CommandServiceInterface
  ): Promise<{ result: ReactNode }>;

  isBuiltin(name: string): boolean;

  getCommandUsage(command: CommandDefinition): Promise<{ result: ReactNode }>;
}

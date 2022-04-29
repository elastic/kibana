/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { CommandDefinition, CommandServiceInterface } from '../types';

export interface BuiltinCommandServiceInterface extends CommandServiceInterface {
  isBuiltin(name: string): boolean;

  getCommandUsage(command: CommandDefinition): Promise<{ result: ReactNode }>;
}

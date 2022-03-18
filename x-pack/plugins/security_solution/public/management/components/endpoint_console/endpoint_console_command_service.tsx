/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { CommandServiceInterface, CommandDefinition, Command } from '../console';

/**
 * Endpoint specific Response Actions (commands) for use with Console.
 */
export class EndpointConsoleCommandService implements CommandServiceInterface {
  getCommandList(): CommandDefinition[] {
    return [];
  }

  async executeCommand(command: Command): Promise<{ result: ReactNode }> {
    return { result: <></> };
  }
}

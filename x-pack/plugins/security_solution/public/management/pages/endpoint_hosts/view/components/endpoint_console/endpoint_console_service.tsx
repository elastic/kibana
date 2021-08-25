/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

import {
  ConsoleServiceInterface,
  CommandDefinition,
  Command,
} from '../../../../../components/console';

export class EndpointConsoleService implements ConsoleServiceInterface {
  getCommandList(): CommandDefinition[] {
    return [
      {
        name: 'isolate',
        about: 'Isolate the host',
        args: undefined,
      },
      {
        name: 'release',
        about: 'Release a host from its network isolation state',
        args: undefined,
      },
    ];
  }

  async executeCommand(command: Command): Promise<{ result: ReactNode }> {
    await new Promise((r) => setTimeout(r, 4000));

    return {
      result: <div>{'command executed successful'}</div>,
    };
  }
}

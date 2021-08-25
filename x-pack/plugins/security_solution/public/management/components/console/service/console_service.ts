/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

// FIXME:PT Maybe create an abstract class based on service interface

export interface CommandDefinition {
  name: string;
  about: string;
  validator?: () => Promise<boolean>;
  args?: {
    [longName: string]: {
      required: boolean;
      about: string;
      validator?: () => Promise<boolean>;
      // Selector: Idea is that the schema can plugin in a rich component for the user to select something (ex. a file)
      selector?: () => Promise<unknown>;
    };
  };
}

/**
 * A command to be executed (as entered by the user)
 */
export interface Command {
  input: string;
  args: Record<string, { value: string }>;
  commandDefinition: CommandDefinition;
}

export interface ConsoleServiceInterface {
  getCommandList(): CommandDefinition[];

  executeCommand(command: Command): Promise<{ result: ReactNode }>;

  /**
   * If defined, then the `help` builtin command will display this output instead of the default one
   * which is generated out of the Command list
   */
  getHelp?: () => Promise<ReactNode>;
}

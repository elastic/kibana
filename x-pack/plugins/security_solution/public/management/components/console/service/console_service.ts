/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';

export interface Command {
  name: string;
  about: string;
  validator?: () => Promise<boolean>;
  args?: {
    [longName: string]: {
      required: boolean;
      about: string;
      validator?: () => Promise<boolean>;
    };
  };
}

export interface ConsoleServiceInterface {
  getCommandList(): Command[];

  executeCommand(): Promise<{ result: unknown }>;

  /**
   * If defined, then the `help` builtin command will display this output instead of the default one
   * which is generated out of the Command list
   */
  getHelp?: () => Promise<ReactNode>;
}

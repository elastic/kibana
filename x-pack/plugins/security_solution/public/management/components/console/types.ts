/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { CommonProps } from '@elastic/eui';
import { ParsedArgData, ParsedCommandInput } from './service/parsed_command_input';

export interface CommandDefinition {
  name: string;
  about: string;
  validator?: () => Promise<boolean>;
  /** If all args are optional, but at least one must be defined, set to true */
  mustHaveArgs?: boolean;
  args?: {
    [longName: string]: {
      required: boolean;
      allowMultiples: boolean;
      about: string;
      /**
       * Validate the individual values given to this argument.
       * Should return `true` if valid or a string with the error message
       */
      validate?: (argData: ParsedArgData) => true | string;
      // Selector: Idea is that the schema can plugin in a rich component for the
      // user to select something (ex. a file)
      // FIXME: implement selector
      selector?: () => unknown;
    };
  };
}

/**
 * A command to be executed (as entered by the user)
 */
export interface Command {
  /** The raw input entered by the user */
  input: string;
  // FIXME:PT this should be a generic that allows for the arguments type to be used
  /** An object with the arguments entered by the user and their value */
  args: ParsedCommandInput;
  /** The command defined associated with this user command */
  commandDefinition: CommandDefinition;
}

export interface CommandServiceInterface {
  getCommandList(): CommandDefinition[];

  executeCommand(command: Command): Promise<{ result: ReactNode }>;

  /**
   * If defined, then the `help` builtin command will display this output instead of the default one
   * which is generated out of the Command list
   */
  getHelp?: () => Promise<{ result: ReactNode }>;

  /**
   * If defined, then the output of this function will be used to display individual
   * command help (`--help`)
   */
  getCommandUsage?: (command: CommandDefinition) => Promise<{ result: ReactNode }>;
}

export interface ConsoleProps extends CommonProps {
  commandService: CommandServiceInterface;
  prompt?: string;
}

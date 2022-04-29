/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, ComponentType } from 'react';
import type { CommonProps } from '@elastic/eui';
import { Immutable } from '../../../../common/endpoint/types';
import type { ParsedArgData, ParsedCommandInput } from './service/parsed_command_input';

export interface CommandDefinition {
  name: string;
  about: string;
  /**
   * The Component that will be used to render the Command
   */
  Component: CommandExecutionComponent;
  /**
   * A store for any data needed when the command is executed.
   * The entire `CommandDefinition` is passed along to the component
   * that will handle it, so this data will be available there
   */
  meta?: Record<string, unknown>;
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

/**
 * The component that will handle the Command execution and display the result.
 */
export type CommandExecutionComponent = ComponentType<{
  command: Immutable<Command>;
  /**
   * A data store for the command execution to store data in, if needed.
   * Because the Console could be closed/opened several times, which will cause this component
   * to be `mounted`/`unmounted` several times, this data store will be beneficial for
   * persisting data (ex. API response with IDs) that the command can use to determine
   * if the command has already been executed or if it's a new instance.
   */
  store: Immutable<Record<string, unknown>>;
  /** Sets the `meta` data above */
  setMeta: (meta: Record<string, unknown>) => void;
  /** The status of the command execution */
  status: 'pending' | 'success' | 'error';
  /** Set the status of the command execution  */
  setStatus: (status: 'pending' | 'success' | 'error') => void;
}>;

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
  /**
   * For internal use only!
   * Provided by the ConsoleManager to indicate that the console is being managed by it
   * @private
   */
  managedKey?: symbol;
}

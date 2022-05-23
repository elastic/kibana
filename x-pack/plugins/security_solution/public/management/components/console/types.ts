/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, ComponentProps } from 'react';
import type { CommonProps } from '@elastic/eui';
import type { CommandExecutionState } from './components/console_state/types';
import type { Immutable } from '../../../../common/endpoint/types';
import type { ParsedArgData, ParsedCommandInput } from './service/parsed_command_input';

export interface CommandDefinition {
  name: string;
  about: string;
  /**
   * The Component that will be used to render the Command
   */
  RenderComponent: CommandExecutionComponent;
  /**
   * If defined, this command's use of `--help` will be displayed using this component instead of
   * the console's built in output.
   */
  HelpComponent?: CommandExecutionComponent;
  /**
   * A store for any data needed when the command is executed.
   * The entire `CommandDefinition` is passed along to the component
   * that will handle it, so this data will be available there
   */
  meta?: Record<string, unknown>;

  /** If all args are optional, but at least one must be defined, set to true */
  mustHaveArgs?: boolean;
  /** The list of arguments supported by this command */
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
      selector?: ComponentType;
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
  command: Command;
  /**
   * A data store for the command execution to store data in, if needed.
   * Because the Console could be closed/opened several times, which will cause this component
   * to be `mounted`/`unmounted` several times, this data store will be beneficial for
   * persisting data (ex. API response with IDs) that the command can use to determine
   * if the command has already been executed or if it's a new instance.
   */
  store: Immutable<CommandExecutionState['store']>;
  /** Sets the `store` data above */
  setStore: (state: CommandExecutionState['store']) => void;
  /**
   * The status of the command execution.
   * Note that the console's UI will show the command as "busy" while the status here is
   * `pending`. Ensure that once the action processing completes, that this is set to
   * either `success` or `error`.
   */
  status: CommandExecutionState['status'];
  /** Set the status of the command execution  */
  setStatus: (status: CommandExecutionState['status']) => void;
}>;

export type CommandExecutionComponentProps = ComponentProps<CommandExecutionComponent>;

export interface ConsoleProps extends CommonProps {
  /**
   * The list of Commands that will be available in the console for the user to execute
   */
  commands: CommandDefinition[];

  /**
   * If defined, then the `help` builtin command will display this output instead of the default one
   * which is generated out of the Command list.
   */
  HelpComponent?: CommandExecutionComponent;

  /**
   * A component to be used in the Console's header title area (left side)
   */
  TitleComponent?: ComponentType;

  prompt?: string;

  /**
   * For internal use only!
   * Provided by the ConsoleManager to indicate that the console is being managed by it
   * @private
   */
  managedKey?: symbol;
}

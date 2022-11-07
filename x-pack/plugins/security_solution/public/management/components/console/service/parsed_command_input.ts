/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CommandDefinition } from '..';

export type PossibleArgDataTypes = string | boolean;

export type ParsedArgData<T = PossibleArgDataTypes> = Array<
  T extends PossibleArgDataTypes ? T : never
>;

interface ParsedCommandInput<TArgs extends object = any> {
  name: string;
  args: {
    [key in keyof TArgs]: ParsedArgData<Required<TArgs>[key]>;
  };
}
const parseInputString = (rawInput: string): ParsedCommandInput => {
  const input = rawInput.trim();
  const response: ParsedCommandInput = {
    name: getCommandNameFromTextInput(input),
    args: {},
  };

  if (!input) {
    return response;
  }

  const inputFirstSpacePosition = input.indexOf(' ');
  const rawArguments =
    inputFirstSpacePosition === -1
      ? []
      : input.substring(inputFirstSpacePosition).trim().split(/--/);

  for (const rawArg of rawArguments) {
    const argNameAndValueTrimmedString = rawArg.trim();

    if (argNameAndValueTrimmedString) {
      // rawArgument possible values here are:
      //    'option=something'
      //    'option'
      //    'option something
      // These all having possible spaces before and after

      const firstSpaceOrEqualSign = /[ =]/.exec(argNameAndValueTrimmedString);

      // Grab the argument name
      const argName = (
        firstSpaceOrEqualSign
          ? argNameAndValueTrimmedString.substring(0, firstSpaceOrEqualSign.index).trim()
          : argNameAndValueTrimmedString
      ).trim();

      if (argName) {
        if (!response.args[argName]) {
          response.args[argName] = [];
        }

        // if this argument name has a value, then process that
        if (argName !== argNameAndValueTrimmedString && firstSpaceOrEqualSign) {
          let newArgValue = argNameAndValueTrimmedString
            .substring(firstSpaceOrEqualSign.index + 1)
            .trim()
            .replace(/\\-\\-/g, '--');

          if (newArgValue.charAt(0) === '"') {
            newArgValue = newArgValue.substring(1);
          }

          if (newArgValue.charAt(newArgValue.length - 1) === '"') {
            newArgValue = newArgValue.substring(0, newArgValue.length - 1);
          }

          response.args[argName].push(newArgValue);
        } else {
          // Argument has not value (bare), set it to empty string
          response.args[argName].push(true);
        }
      }
    }
  }

  return response;
};

export interface ParsedCommandInterface<TArgs extends object = any>
  extends ParsedCommandInput<TArgs> {
  input: string;

  /**
   * Checks if the given argument name was entered by the user
   * @param argName
   */
  hasArg(argName: string): boolean;

  /**
   * if any argument was entered
   */
  hasArgs: boolean;
}

class ParsedCommand implements ParsedCommandInterface {
  public readonly name: string;
  public readonly args: Record<string, string[]>;
  public readonly hasArgs: boolean;

  constructor(public readonly input: string) {
    const parseInput = parseInputString(input);
    this.name = parseInput.name;
    this.args = parseInput.args;
    this.hasArgs = Object.keys(this.args).length > 0;
  }

  hasArg(argName: string): boolean {
    return argName in this.args;
  }
}

export const parseCommandInput = (input: string): ParsedCommandInterface => {
  return new ParsedCommand(input);
};

export const getCommandNameFromTextInput = (input: string): string => {
  const trimmedInput = input.trimStart();

  if (!trimmedInput) {
    return '';
  }

  const firstSpacePosition = input.indexOf(' ');

  if (firstSpacePosition === -1) {
    return trimmedInput;
  }

  return trimmedInput.substring(0, firstSpacePosition);
};

export const getArgumentsForCommand = (command: CommandDefinition): string[] => {
  let requiredArgs = '';
  let optionalArgs = '';
  const exclusiveOrArgs = [];

  if (command.args) {
    for (const [argName, argDefinition] of Object.entries(command.args)) {
      if (argDefinition.required) {
        if (requiredArgs.length) {
          requiredArgs += ' ';
        }
        requiredArgs += `--${argName}`;
      } else if (argDefinition.exclusiveOr) {
        exclusiveOrArgs.push(`--${argName}`);
      } else {
        if (optionalArgs.length) {
          optionalArgs += ' ';
        }
        optionalArgs += `--${argName}`;
      }
    }
  }

  const buildArgumentText = ({
    required,
    exclusive,
    optional,
  }: {
    required?: string;
    exclusive?: string;
    optional?: string;
  }) => {
    return `${required ? required : ''}${exclusive ? ` ${exclusive}` : ''} ${
      optional && optional.length > 0 ? `[${optional}]` : ''
    }`.trim();
  };

  return exclusiveOrArgs.length > 0
    ? exclusiveOrArgs.map((exclusiveArg) => {
        return buildArgumentText({
          required: requiredArgs,
          exclusive: exclusiveArg,
          optional: optionalArgs,
        });
      })
    : requiredArgs || optionalArgs
    ? [buildArgumentText({ required: requiredArgs, optional: optionalArgs })]
    : [];
};

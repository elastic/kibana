/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import argsplit from 'argsplit';

// FIXME:PT use a 3rd party lib for arguments parsing
//        For now, just using what I found in kibana package.json devDependencies, so this will NOT work for production

// FIXME:PT Type `ParsedCommandInput` should be a generic that allows for the args's keys to be defined

export interface ParsedArgData {
  /** For arguments that were used only once. Will be `undefined` if multiples were used */
  value: undefined | string;
  /** For arguments that were used multiple times */
  values: undefined | string[];
}

export interface ParsedCommandInput {
  input: string;
  name: string;
  args: {
    [argName: string]: ParsedArgData;
  };
  unknownArgs: undefined | string[];
  hasArgs(): boolean;
  hasArg(argName: string): boolean;
}

const PARSED_COMMAND_INPUT_PROTOTYPE: Pick<ParsedCommandInput, 'hasArgs'> = Object.freeze({
  hasArgs(this: ParsedCommandInput) {
    return Object.keys(this.args).length > 0 || Array.isArray(this.unknownArgs);
  },

  hasArg(argName: string): boolean {
    // @ts-ignore
    return Object.prototype.hasOwnProperty.call(this.args, argName);
  },
});

export const parseCommandInput = (input: string): ParsedCommandInput => {
  const inputTokens: string[] = argsplit(input) || [];
  const name: string = inputTokens.shift() || '';
  const args: ParsedCommandInput['args'] = {};
  let unknownArgs: ParsedCommandInput['unknownArgs'];

  // All options start with `--`
  let argName = '';

  for (const inputToken of inputTokens) {
    if (inputToken.startsWith('--')) {
      argName = inputToken.substr(2);

      if (!args[argName]) {
        args[argName] = {
          value: undefined,
          values: undefined,
        };
      }

      // eslint-disable-next-line no-continue
      continue;
    } else if (!argName) {
      (unknownArgs = unknownArgs || []).push(inputToken);

      // eslint-disable-next-line no-continue
      continue;
    }

    if (Array.isArray(args[argName].values)) {
      // @ts-ignore
      args[argName].values.push(inputToken);
    } else {
      // Do we have multiple values for this argumentName, then create array for values
      if (args[argName].value !== undefined) {
        args[argName].values = [args[argName].value ?? '', inputToken];
        args[argName].value = undefined;
      } else {
        args[argName].value = inputToken;
      }
    }
  }

  return Object.assign(Object.create(PARSED_COMMAND_INPUT_PROTOTYPE), {
    input,
    name,
    args,
    unknownArgs,
  });
};

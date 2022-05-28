/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommandDefinition } from '../types';

export const usageFromCommandDefinition = (command: CommandDefinition): string => {
  let requiredArgs = '';
  let optionalArgs = '';

  if (command.args) {
    for (const [argName, argDefinition] of Object.entries(command.args)) {
      if (argDefinition.required) {
        if (requiredArgs.length) {
          requiredArgs += ' ';
        }
        requiredArgs += `--${argName}`;
      } else {
        if (optionalArgs.length) {
          optionalArgs += ' ';
        }
        optionalArgs += `--${argName}`;
      }
    }
  }

  return `${command.name} ${requiredArgs} ${
    optionalArgs.length > 0 ? `[${optionalArgs}]` : ''
  }`.trim();
};

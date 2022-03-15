/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommandDefinition } from '../types';

export const builtInCommands = (): CommandDefinition[] => {
  return [
    {
      name: 'help',
      about: 'View list of available commands',
    },
    {
      name: 'clear',
      about: 'Clear the console buffer',
    },
  ];
};

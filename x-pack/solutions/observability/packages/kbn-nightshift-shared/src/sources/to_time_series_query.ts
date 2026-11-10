/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Parser } from '@elastic/esql';

/** Rewrites a source to `TS` until elasticsearch#163536 lets `TS` read ES|QL views. */
export const toTimeSeriesSourceQuery = (esql: string): string => {
  const { errors, root } = Parser.parse(esql);
  if (errors.length > 0) {
    throw new Error(`Invalid ES|QL query: ${errors.map(({ message }) => message).join('; ')}`);
  }

  const [firstCommand] = root.commands;
  if (!firstCommand || (firstCommand.name !== 'from' && firstCommand.name !== 'ts')) {
    throw new Error('A source query must start with FROM or TS');
  }

  return BasicPrettyPrinter.print({
    ...root,
    commands: root.commands.map((command, index) =>
      index === 0 && command.name === 'from' ? { ...command, name: 'ts' } : command
    ),
  });
};

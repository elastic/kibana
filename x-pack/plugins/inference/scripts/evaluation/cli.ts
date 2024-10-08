/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Argv } from 'yargs';
import { connectorIdOption, elasticsearchOption, kibanaOption } from '../util/cli_options';

export enum EvaluateWith {
  same = 'same',
  other = 'other',
}

export function options(y: Argv) {
  return y
    .option('files', {
      string: true as const,
      array: true,
      describe: 'A file or list of files containing the scenarios to evaluate. Defaults to all',
    })
    .option('grep', {
      string: true,
      array: false,
      describe: 'A string or regex to filter scenarios by',
    })
    .option('kibana', kibanaOption)
    .option('spaceId', {
      describe: 'The space to use.',
      string: true,
      array: false,
    })
    .option('elasticsearch', elasticsearchOption)
    .option('connectorId', connectorIdOption)
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    })
    .option('evaluateWith', {
      describe:
        'The connector ID to evaluate with. Leave empty for the same connector, use "other" to get a selection menu',
      default: EvaluateWith.same,
    });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { format, parse } from 'url';
import { Argv } from 'yargs';
import { readKibanaConfig } from './read_kibana_config';

export enum EvaluateWith {
  same = 'same',
  other = 'other',
}

const config = readKibanaConfig();

export const kibanaOption = {
  describe: 'Where Kibana is running',
  string: true as const,
  default: process.env.KIBANA_HOST || 'http://localhost:5601',
};
export const elasticsearchOption = {
  alias: 'es',
  describe: 'Where Elasticsearch is running',
  string: true as const,
  default: format({
    ...parse(config['elasticsearch.hosts']),
    auth: `${config['elasticsearch.username']}:${config['elasticsearch.password']}`,
  }),
};

export const connectorIdOption = {
  describe: 'The ID of the connector',
  string: true as const,
};

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
      describe:
        'The space to use. If space is set, conversations will only be cleared for that spaceId',
      string: true,
      array: false,
    })
    .option('elasticsearch', elasticsearchOption)
    .option('connectorId', connectorIdOption)
    .option('persist', {
      describe:
        'Whether the conversations should be stored. Adding this will generate a link at which the conversation can be opened.',
      boolean: true,
      default: false,
    })
    .option('clear', {
      describe: 'Clear conversations on startup',
      boolean: true,
      default: false,
    })
    .option('autoTitle', {
      describe: 'Whether to generate titles for new conversations',
      boolean: true,
      default: false,
    })
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    })
    .option('evaluateWith', {
      describe:
        'The connector ID to evaluate with. Leave empty for the same connector, use "other" to get a selection menu',
      default: EvaluateWith.same,
    })
    .check((argv) => {
      if (!argv.persist && argv.clear) {
        throw new Error('clear cannot be true if persist is false');
      }
      if (!argv.persist && argv.autoTitle) {
        throw new Error('autoTitle cannot be true if persist is false');
      }
      return true;
    });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { format, parse } from 'url';
import { Argv } from 'yargs';
import { readKibanaConfig } from './read_kibana_config';

export function options(y: Argv) {
  const config = readKibanaConfig();

  return y
    .positional('grep', {
      string: true as const,
      array: true,
      describe: 'A glob pattern for which scenarios to evaluate',
    })
    .option('kibana', {
      describe: 'Where Kibana is running',
      string: true,
      default: process.env.KIBANA_HOST || 'http://localhost:5601',
    })
    .option('elasticsearch', {
      alias: 'es',
      describe: 'Where Elasticsearch is running',
      string: true,
      default: format({
        ...parse(config['elasticsearch.hosts']),
        auth: `${config['elasticsearch.username']}:${config['elasticsearch.password']}`,
      }),
    })
    .option('connectorId', {
      describe: 'The ID of the connector',
      string: true,
    })
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

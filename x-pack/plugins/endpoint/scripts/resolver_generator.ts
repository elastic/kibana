/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import yargs = require('yargs');
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { EndpointDocGenerator } from '../common/generate_data';

main();

async function main() {
  const argv = yargs.help().options({
    seed: {
      alias: 's',
      describe: 'random seed to use for document generator',
      type: 'string',
    },
    node: {
      alias: 'n',
      describe: 'elasticsearch node url',
      default: 'http://localhost:9200',
      type: 'string',
    },
    index: {
      alias: 'i',
      describe: 'elasticsearch index name',
      default: 'my-index',
      type: 'string',
    },
    auth: {
      alias: 'auth',
      describe: 'elasticsearch username and password, separated by a colon',
      type: 'string',
    },
    ancestors: {
      alias: 'a',
      describe: 'number of ancestors of origin to create',
      type: 'number',
      default: 3,
    },
    generations: {
      alias: 'g',
      describe: 'number of child generations to create',
      type: 'number',
      default: 3,
    },
    children: {
      alias: 'c',
      describe: 'maximum number of children per node',
      type: 'number',
      default: 3,
    },
    relatedEvents: {
      alias: 'r',
      describe: 'number of related events to create for each process event',
      type: 'number',
      default: 5,
    },
    percentWithRelated: {
      alias: 'pr',
      describe: 'percent of process events to add related events to',
      type: 'number',
      default: 30,
    },
    percentTerminated: {
      alias: 'pt',
      describe: 'percent of process events to add termination event for',
      type: 'number',
      default: 30,
    },
  }).argv;
  const generator = new EndpointDocGenerator(argv.seed);
  const clientOptions: ClientOptions = {
    node: argv.node,
  };
  if (argv.auth) {
    const [username, password]: string[] = argv.auth.split(':', 2);
    clientOptions.auth = { username, password };
  }
  const client = new Client(clientOptions);
  await client.index({
    index: argv.index,
    body: generator.generateEndpointMetadata(),
  });

  const resolverDocs = generator.generateFullResolverTree(
    argv.ancestors,
    argv.generations,
    argv.children,
    argv.relatedEvents,
    argv.percentWithRelated,
    argv.percentTerminated
  );
  const body = resolverDocs
    .map(doc => [{ index: { _index: argv.index } }, doc])
    .reduce((array, value) => (array.push(...value), array), []);

  await client.bulk({ body });
}

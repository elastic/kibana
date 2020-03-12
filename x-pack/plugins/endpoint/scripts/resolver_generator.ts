/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import yargs = require('yargs');
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { EndpointDocGenerator } from '../common/generate_data';
import { default as mapping } from '../common/mapping.json';

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
    eventIndex: {
      alias: 'ei',
      describe: 'index to store events in',
      default: 'events-endpoint-1',
      type: 'string',
    },
    metadataIndex: {
      alias: 'mi',
      describe: 'index to store endpoint metadata in',
      default: 'endpoint-agent-1',
      type: 'string',
    },
    auth: {
      describe: 'elasticsearch username and password, separated by a colon',
      type: 'string',
    },
    ancestors: {
      alias: 'anc',
      describe: 'number of ancestors of origin to create',
      type: 'number',
      default: 3,
    },
    generations: {
      alias: 'gen',
      describe: 'number of child generations to create',
      type: 'number',
      default: 3,
    },
    children: {
      alias: 'ch',
      describe: 'maximum number of children per node',
      type: 'number',
      default: 3,
    },
    relatedEvents: {
      alias: 'related',
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
    numEndpoints: {
      alias: 'ne',
      describe: 'number of different endpoints to generate alerts for',
      type: 'number',
      default: 1,
    },
    alertsPerEndpoint: {
      alias: 'ape',
      describe: 'number of resolver trees to make for each endpoint',
      type: 'number',
      default: 1,
    },
  }).argv;
  const clientOptions: ClientOptions = {
    node: argv.node,
  };
  if (argv.auth) {
    const [username, password]: string[] = argv.auth.split(':', 2);
    clientOptions.auth = { username, password };
  }
  const client = new Client(clientOptions);
  try {
    await client.indices.delete({
      index: [argv.eventIndex, argv.metadataIndex],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
  try {
    await client.indices.create({
      index: argv.eventIndex,
      body: mapping,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
  const generator = new EndpointDocGenerator(argv.seed);
  for (let i = 0; i < argv.numEndpoints; i++) {
    await client.index({
      index: argv.metadataIndex,
      body: generator.generateEndpointMetadata(),
    });
    for (let j = 0; j < argv.alertsPerEndpoint; j++) {
      const resolverDocs = generator.generateFullResolverTree(
        argv.ancestors,
        argv.generations,
        argv.children,
        argv.relatedEvents,
        argv.percentWithRelated,
        argv.percentTerminated
      );
      const body = resolverDocs
        .map(doc => [{ index: { _index: argv.eventIndex } }, doc])
        .reduce((array, value) => (array.push(...value), array), []);

      await client.bulk({ body });
    }
    generator.randomizeHostData();
  }
}

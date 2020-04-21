/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as yargs from 'yargs';
import seedrandom from 'seedrandom';
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { EndpointDocGenerator, Event } from '../common/generate_data';
import { default as eventMapping } from './event_mapping.json';
import { default as alertMapping } from './alert_mapping.json';

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
    alertIndex: {
      alias: 'ai',
      describe: 'index to store alerts in',
      default: 'events-endpoint-1',
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
      describe: 'index to store host metadata in',
      default: 'metrics-endpoint-default-1',
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
    numHosts: {
      alias: 'ne',
      describe: 'number of different hosts to generate alerts for',
      type: 'number',
      default: 1,
    },
    alertsPerHost: {
      alias: 'ape',
      describe: 'number of resolver trees to make for each host',
      type: 'number',
      default: 1,
    },
    delete: {
      alias: 'd',
      describe: 'delete indices and remake them',
      type: 'boolean',
      default: false,
    },
    setupOnly: {
      alias: 'so',
      describe:
        'Run only the index and pipeline creation then exit. This is intended to be used to set up the Endpoint App for use with the real Elastic Endpoint.',
      type: 'boolean',
      default: false,
    },
  }).argv;
  const pipelineName = 'endpoint-event-pipeline';
  eventMapping.settings.index.default_pipeline = pipelineName;
  const clientOptions: ClientOptions = {
    node: argv.node,
  };
  if (argv.auth) {
    const [username, password]: string[] = argv.auth.split(':', 2);
    clientOptions.auth = { username, password };
  }
  const client = new Client(clientOptions);
  if (argv.delete) {
    try {
      await client.indices.delete({
        index: [argv.eventIndex, argv.metadataIndex, argv.alertIndex],
      });
    } catch (err) {
      if (err instanceof ResponseError && err.statusCode !== 404) {
        // eslint-disable-next-line no-console
        console.log(err);
        process.exit(1);
      }
    }
  }

  const pipeline = {
    description: 'redirects alerts to their own index',
    processors: [
      {
        set: {
          field: '_index',
          value: argv.alertIndex,
          if: "ctx.event.kind == 'alert'",
        },
      },
      {
        set: {
          field: 'mutable_state.triage_status',
          value: 'open',
        },
      },
    ],
  };
  try {
    await client.ingest.putPipeline({
      id: pipelineName,
      body: pipeline,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
    process.exit(1);
  }

  await createIndex(client, argv.alertIndex, alertMapping);
  await createIndex(client, argv.eventIndex, eventMapping);
  if (argv.setupOnly) {
    process.exit(0);
  }

  let seed = argv.seed;
  if (!seed) {
    seed = Math.random().toString();
    // eslint-disable-next-line no-console
    console.log('No seed supplied, using random seed: ' + seed);
  }
  const random = seedrandom(seed);
  for (let i = 0; i < argv.numHosts; i++) {
    const generator = new EndpointDocGenerator(random);
    const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
    const numMetadataDocs = 5;
    const timestamp = new Date().getTime();
    for (let j = 0; j < numMetadataDocs; j++) {
      generator.updateHostData();
      await client.index({
        index: argv.metadataIndex,
        body: generator.generateHostMetadata(
          timestamp - timeBetweenDocs * (numMetadataDocs - j - 1)
        ),
      });
    }

    for (let j = 0; j < argv.alertsPerHost; j++) {
      const resolverDocGenerator = generator.fullResolverTreeGenerator(
        argv.ancestors,
        argv.generations,
        argv.children,
        argv.relatedEvents,
        argv.percentWithRelated,
        argv.percentTerminated
      );
      let result = resolverDocGenerator.next();
      while (!result.done) {
        let k = 0;
        const resolverDocs: Event[] = [];
        while (k < 1000 && !result.done) {
          resolverDocs.push(result.value);
          result = resolverDocGenerator.next();
          k++;
        }
        const body = resolverDocs.reduce(
          (array: Array<Record<string, any>>, doc) => (
            array.push({ index: { _index: argv.eventIndex } }, doc), array
          ),
          []
        );
        await client.bulk({ body });
      }
    }
  }
}

async function createIndex(client: Client, index: string, mapping: any) {
  try {
    await client.indices.create({
      index,
      body: mapping,
    });
  } catch (err) {
    if (
      err instanceof ResponseError &&
      err.body.error.type !== 'resource_already_exists_exception'
    ) {
      // eslint-disable-next-line no-console
      console.log(err.body);
      process.exit(1);
    }
  }
}

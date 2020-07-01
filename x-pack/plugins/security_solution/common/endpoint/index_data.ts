/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import seedrandom from 'seedrandom';
import { EndpointDocGenerator, TreeOptions, Event } from './generate_data';

export async function indexHostsAndAlerts(
  client: Client,
  seed: string,
  numHosts: number,
  numDocs: number,
  metadataIndex: string,
  policyIndex: string,
  eventIndex: string,
  alertIndex: string,
  alertsPerHost: number,
  options: TreeOptions = {}
) {
  const random = seedrandom(seed);
  for (let i = 0; i < numHosts; i++) {
    const generator = new EndpointDocGenerator(random);
    await indexHostDocs(numDocs, client, metadataIndex, policyIndex, generator);
    await indexAlerts(client, eventIndex, alertIndex, generator, alertsPerHost, options);
  }
  await client.indices.refresh({
    index: eventIndex,
  });
  // TODO: Unclear why the documents are not showing up after the call to refresh.
  // Waiting 5 seconds allows the indices to refresh automatically and
  // the documents become available in API/integration tests.
  await delay(5000);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function indexHostDocs(
  numDocs: number,
  client: Client,
  metadataIndex: string,
  policyIndex: string,
  generator: EndpointDocGenerator
) {
  const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
  const timestamp = new Date().getTime();
  for (let j = 0; j < numDocs; j++) {
    generator.updateHostData();
    generator.updatePolicyId();
    await client.index({
      index: metadataIndex,
      body: generator.generateHostMetadata(timestamp - timeBetweenDocs * (numDocs - j - 1)),
      op_type: 'create',
    });
    await client.index({
      index: policyIndex,
      body: generator.generatePolicyResponse(timestamp - timeBetweenDocs * (numDocs - j - 1)),
      op_type: 'create',
    });
  }
}

async function indexAlerts(
  client: Client,
  eventIndex: string,
  alertIndex: string,
  generator: EndpointDocGenerator,
  numAlerts: number,
  options: TreeOptions = {}
) {
  const alertGenerator = generator.alertsGenerator(numAlerts, options);
  let result = alertGenerator.next();
  while (!result.done) {
    let k = 0;
    const resolverDocs: Event[] = [];
    while (k < 1000 && !result.done) {
      resolverDocs.push(result.value);
      result = alertGenerator.next();
      k++;
    }
    const body = resolverDocs.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (array: Array<Record<string, any>>, doc) => {
        let index = eventIndex;
        if (doc.event.kind === 'alert') {
          index = alertIndex;
        }
        array.push({ create: { _index: index } }, doc);
        return array;
      },
      []
    );
    await client.bulk({ body, refresh: 'true' });
  }
}

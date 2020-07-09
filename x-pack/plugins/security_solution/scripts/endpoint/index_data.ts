/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import { EndpointDocGenerator, Event } from '../../common/endpoint/generate_data';

/**
 * Generate and index 'host' documents.
 */
export async function indexHostDocs(
  /**
   * Limits the amount of data that will be generated and indexed.
   * Generates and indexes policy documents as well.
   */
  numDocs: number,
  /**
   * ES client to use when indexing.
   */
  client: Client,
  /**
   * Index for 'host' documents.
   */
  metadataIndex: string,
  /**
   * Index for 'policy' documents.
   */
  policyIndex: string,
  /**
   * A generator instance to use.
   */
  generator: EndpointDocGenerator
): Promise<void> {
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

/**
 * Indexes alert, and alert-related events.
 */
export async function indexAlerts(
  /**
   * ES client to use when indexing.
   */
  client: Client,
  /**
   * Index to put the non-alert documents.
   */
  eventIndex: string,
  /**
   * Index for alert documents.
   */
  alertIndex: string,
  /**
   * events to index.
   */
  events: Event[]
) {
  const body = events.reduce(
    // TODO fix
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

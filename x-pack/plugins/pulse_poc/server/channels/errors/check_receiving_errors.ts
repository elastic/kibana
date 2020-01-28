/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { CheckContext } from '../../types';

// a set to store instruction hashes (currnetly the document hashes):
const instructionsSeen = new Set();

export async function check(es: IScopedClusterClient, { deploymentId, indexName }: CheckContext) {
  // TODO: modify the search query for full text search and for the correct search!
  const response = await es.callAsInternalUser('search', {
    index: indexName,
    size: 10,
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          must: [
            {
              term: { deployment_id: deploymentId },
            },
            {
              match: { status: 'new' },
            },
          ],
          filter: {
            range: {
              timestamp: {
                gte: 'now-5s',
                lte: 'now',
              },
            },
          },
        },
      },
    },
  });

  if (response.hits.hits.length) {
    const sources = response.hits.hits.map((hit: any) => {
      const source = {
        ...hit._source,
      };
      return source;
    });
    // TODO: modify the set /change to a Map to keep a record of the instructions weve already sent to the browser/deployment
    // TODO: change the instruction we actually send back to something more meaningful than just the doc itself.
    // e.g. if there is a fixed version, create a text message that gives info about the fixed version, including url to fix blah, blah,
    // if there isn't a fix yet but we know about it and have at least one previous record (...a counter maybe?), then send back a message with 'there's a fix underway....)

    // "middleware" to do data transforms from teh raw document into an actual human-readable instruction and to check if we should actually send the instruction (it's not a duplicate).
    // NOTE: using a map means that we will always return an array with a length of at least 1 but that 1 entry might be null
    const instructionsToSend = sources.map((source: any) => {
      // check if we've already sent it --> will eventually have to also check the deployments it's been sent to
      if (!instructionsSeen.has(source.hash)) {
        instructionsSeen.add(source.hash);
        const instruction = {
          ...source,
          sendTo: source.fixedVersion ? 'newsfeed' : 'toasts', // some sort of login to categorize where the notifications should render/be interpreted
        };
        return instruction;
      }
      return;
    });
    if (instructionsToSend.length) {
      return instructionsToSend;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

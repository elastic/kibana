/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { CheckContext } from '../../types';
// TODO: we still want a lookup hash table of error hashes with their fixed versions and/or steps to take to resolve them in here. However, it shouldn't be a blocker for actually sending instructions.
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
            // {
            //   term: { status: 'new' },
            // },
          ],
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
    // TODO: change the instruction we actually send back to something more meaningful than just the doc itself.
    // e.g. if there is a fixed version, create a text message that gives info about the fixed version, including url to fix blah, blah,
    // if there isn't a fix yet but we know about it and have at least one previous record (...a counter maybe?), then send back a message with 'there's a fix underway....)

    // "middleware" to do data transforms from teh raw document into an actual human-readable instruction and to check if we should actually send the instruction (it's not a duplicate).
    const instructionsToSend = sources.map((source: any) => {
      const instruction = {
        ...source,
        pulseMessage: source.fixedVersion
          ? `The error ${source.hash} has been fixed in version ${source.fixedVersion}.`
          : 'The error has been reported to Pulse',
        sendTo: source.fixedVersion ? 'newsfeed' : 'toasts', // some sort of login to categorize where the notifications should render/be interpreted
      };
      return instruction;
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

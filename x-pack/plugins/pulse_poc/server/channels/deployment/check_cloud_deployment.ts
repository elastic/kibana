/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PulsePOCCheckFunction, PulsePOCSetupFunction } from '../../types';

const mappings = {
  properties: {}, // TODO: Define based on content
};

export const setup: PulsePOCSetupFunction = async (es, index) => {
  const exists = await es.callAsInternalUser('indices.exists', {
    index,
  });
  if (!exists) {
    await es.callAsInternalUser('indices.create', {
      index,
      body: {
        settings: {
          number_of_shards: 1,
          // TODO: add pipeline to add the geoip
        },
        mappings,
      },
    });
  }
};

export interface CloudCostInstruction {
  cloudCosts: { hourlyCost: number };
}

export const check: PulsePOCCheckFunction<CloudCostInstruction> = async (
  es,
  { deploymentId, indexName }
) => {
  const {
    hits: {
      hits: [hit],
    },
  } = await es.callAsInternalUser('search', {
    index: indexName,
    size: 1, // We only need 1 in this channel.
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      query: {
        term: {
          deployment_id: {
            value: deploymentId,
          },
        },
      },
    },
  });

  if (hit?._source) {
    const cloudCosts = await calculateCloudCosts(hit._source);
    return cloudCosts ? [{ cloudCosts }] : [];
  }

  return [];
};

async function calculateCloudCosts(document: any) {
  // TODO: Find a proper way of calculating the number and size of needed. At the moment, only based on the JVM heap used
  const hourlyCost =
    0.0189 * Math.ceil(document.stats.nodes.jvm.mem.heap_used_in_bytes / megabytes(100)); // Only based on 100MB for the POC so we get the numbers moving.
  return { hourlyCost };
}

function megabytes(mb: number) {
  return mb * 1024 * 1024;
}

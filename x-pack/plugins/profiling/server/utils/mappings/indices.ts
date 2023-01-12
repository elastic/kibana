/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import IndicesApi from '@elastic/elasticsearch/lib/api/api/indices';
import { IndicesCreateResponse } from '@elastic/elasticsearch/lib/api/types';

export async function bootstrapIndices(client: IndicesApi): Promise<IndicesCreateResponse[]> {
  return bootstrapKVIndicesWithAliases(client)
    .then(() => bootstrapLockingIndices(client))
    .then(() => bootstrapSymbolizationIndices(client));
}

// Bootstrap the initial indices to store K/V data.
// This will fail if the indices already exist.
async function bootstrapKVIndicesWithAliases(client: IndicesApi): Promise<IndicesCreateResponse[]> {
  const kvIndices = ['profiling-stacktraces', 'profiling-stackframes', 'profiling-executables'];
  const indicesNames = kvIndices.flatMap((index) => [`${index}-000001`, `${index}-000002`]);
  const aliasesNames = kvIndices.flatMap((index) => [`${index}`, `${index}-next`]);
  // Create a request for each index/alias pair to create it
  return Promise.all(
    indicesNames.map((index, entryIndex) =>
      client.create({
        index,
        aliases: {
          [aliasesNames[entryIndex]]: {
            is_write_index: true,
          },
        },
      })
    )
  );
}

async function bootstrapSymbolizationIndices(client: IndicesApi): Promise<IndicesCreateResponse[]> {
  return Promise.all([
    // Symbolization Queue executables index
    client.create({
      index: 'profiling-sq-executables',
      settings: {
        index: {
          refresh_interval: '10s',
        },
      },
      mappings: {
        _source: {
          mode: 'synthetic',
        },
        properties: {
          'ecs.version': {
            type: 'keyword',
            index: true,
          },
          'Executable.file.id': {
            type: 'keyword',
            index: false,
          },
          'Time.created': {
            type: 'date',
            index: true,
          },
          'Symbolization.time.next': {
            type: 'date',
            index: true,
          },
          'Symbolization.retries': {
            type: 'short',
            index: true,
          },
        },
      },
    }),
    // Symbolization Queue leaf frames index
    client.create({
      index: 'profiling-sq-leafframes',
      settings: {
        index: {
          refresh_interval: '10s',
        },
      },
      mappings: {
        _source: {
          mode: 'synthetic',
        },
        properties: {
          'ecs.version': {
            type: 'keyword',
            index: true,
          },
          'Stacktrace.frame.id': {
            type: 'keyword',
            index: false,
          },
          'Time.created': {
            type: 'date',
            index: true,
          },
          'Symbolization.time.next': {
            type: 'date',
            index: true,
          },
          'Symbolization.retries': {
            type: 'short',
            index: true,
          },
        },
      },
    }),
  ]);
}

// Create the custom ILM locking index used to track ILM execution on K/V indices
async function bootstrapLockingIndices(client: IndicesApi) {
  return client.create({
    index: '.profiling-ilm-lock',
    settings: {
      index: {
        hidden: true,
      },
    },
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
          format: 'epoch_second',
        },
        phase: {
          type: 'keyword',
        },
      },
    },
  });
}

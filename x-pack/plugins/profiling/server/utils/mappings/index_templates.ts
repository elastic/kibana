/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import IndicesApi from '@elastic/elasticsearch/lib/api/api/indices';
import { IndicesPutIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';

// Apply the index templates for data streams and K/V lookup indices.
export async function putIndexTemplates(
  client: IndicesApi
): Promise<IndicesPutIndexTemplateResponse[]> {
  const subSampledIndicesIdx = Array.from(Array(11).keys(), (item: number) => item + 1);
  const subSampledIndexName = (pow: number): string => {
    return `profiling-events-5pow${String(pow).padStart(2, '0')}`;
  };
  // Generate all the possible index template names
  const eventsIndices = ['profiling-events-all'].concat(
    subSampledIndicesIdx.map((pow) => subSampledIndexName(pow))
  );

  return Promise.all(
    eventsIndices
      .map((name) =>
        client.putIndexTemplate({
          name,
          // Don't fail if the index template already exists, simply overwrite the format
          create: false,
          index_patterns: [name + '*'],
          data_stream: {
            hidden: false,
          },
          composed_of: ['profiling-events', 'profiling-ilm'],
          priority: 100,
          _meta: {
            description: `Index template for ${name}`,
          },
        })
      )
      .concat(
        ['profiling-executables', 'profiling-stacktraces', 'profiling-stackframes'].map((name) =>
          client.putIndexTemplate({
            name,
            // Don't fail if the index template already exists, simply overwrite the format
            create: false,
            index_patterns: [name + '*'],
            composed_of: [name],
            _meta: {
              description: `Index template for ${name}`,
            },
          })
        )
      )
  );
}

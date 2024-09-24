/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import type { Client } from '@elastic/elasticsearch';

export const writeToDisk = async ({
  index,
  productName,
  destFolder,
  client,
}: {
  index: string;
  productName: string;
  destFolder: string;
  client: Client;
}) => {
  const searchRes = await client.search({
    index,
    size: 10000,
    query: {
      bool: {
        must: [{ term: { product_name: productName } }],
      },
    },
  });

  await Fs.mkdir(destFolder, { recursive: true });

  for (const hit of searchRes.hits.hits) {
    await Fs.writeFile(
      Path.join(destFolder, hit._id + '.json'),
      JSON.stringify(hit._source, undefined, 2)
    );
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';

export async function createOrUpdateIndex({
  client,
  clear,
  indexName,
  template,
}: {
  client: Client;
  clear: boolean;
  indexName: string;
  template: any;
}) {
  if (clear) {
    try {
      await client.indices.delete({
        index: indexName,
      });
    } catch (err) {
      // 404 = index not found, totally okay
      if (err.body.status !== 404) {
        throw err;
      }
    }
  }

  // Some settings are non-updateable and need to be removed.
  const settings = { ...template.settings };
  delete settings?.index?.number_of_shards;
  delete settings?.index?.sort;

  const indexExists = (
    await client.indices.exists({
      index: indexName,
    })
  ).body as boolean;

  if (!indexExists) {
    await client.indices.create({
      index: indexName,
      body: template,
    });
  } else {
    await client.indices.close({ index: indexName });
    await Promise.all([
      template.mappings
        ? client.indices.putMapping({
            index: indexName,
            body: template.mappings,
          })
        : Promise.resolve(undefined as any),
      settings
        ? client.indices.putSettings({
            index: indexName,
            body: settings,
          })
        : Promise.resolve(undefined as any),
    ]);
    await client.indices.open({ index: indexName });
  }
}

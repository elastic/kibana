/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ESClient } from './es';

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
  };
}

function formatSample(sample: string): DocTemplate {
  const docsTemplate: DocTemplate = {
    _index: 'index',
    _id: 'id',
    _source: { message: '' },
  };
  const formatted: DocTemplate = { ...docsTemplate };
  formatted._source.message = sample;
  return formatted;
}

export async function testPipeline(
  samples: string[],
  pipeline: object
): Promise<[object[], object[]]> {
  const docs = samples.map((sample) => formatSample(sample));
  const results: object[] = [];
  const errors: object[] = [];

  const client = ESClient.getClient();
  try {
    const output = await client.asCurrentUser.ingest.simulate({ docs, pipeline });
    for (const doc of output.docs) {
      if (doc.doc?._source?.error) {
        errors.push(doc.doc._source.error);
      } else if (doc.doc?._source) {
        results.push(doc.doc._source);
      }
    }
  } catch (e) {
    errors.push({ error: (e as Error).message });
  }

  return [errors, results];
}

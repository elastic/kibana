/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient } from '@kbn/core/server';

export async function previewIndexTimeRange(
  client: IScopedClusterClient,
  timeField: string,
  pipeline: IngestPipeline,
  docs: any[]
): Promise<{ start: number | null; end: number | null }> {
  for (const doc of docs) {
    if (doc.event === undefined) {
      doc.event = {
        timezone: 'UTC',
      };
    } else if (doc.event.timezone === undefined) {
      doc.event.timezone = 'UTC';
    }
  }

  const resp = await client.asInternalUser.ingest.simulate({
    pipeline,
    docs: docs.map((doc, i) => ({
      _index: 'index',
      _id: `id${i}`,
      _source: doc,
    })),
  });

  const timeFieldValues: string[] = resp.docs.map((doc) => doc.doc?._source[timeField]);

  const epochs: number[] = timeFieldValues
    .map((timeFieldValue) => dateMath.parse(timeFieldValue)?.valueOf())
    .filter((epoch) => epoch !== undefined) as number[];

  return {
    start: Math.min(...epochs),
    end: Math.max(...epochs),
  };
}

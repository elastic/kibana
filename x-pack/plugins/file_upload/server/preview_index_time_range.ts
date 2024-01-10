/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient } from '@kbn/core/server';
import dateMath from '@kbn/datemath';

async function getTimeFromDoc(
  client: IScopedClusterClient,
  timeField: string,
  doc: any,
  pipeline: IngestPipeline
): Promise<{
  time: { epoch: number; string: string };
}> {
  if (doc.event === undefined) {
    doc.event = {
      timezone: 'UTC',
    };
  } else if (doc.event.timezone === undefined) {
    doc.event.timezone = 'UTC';
  }

  const resp = await client.asInternalUser.ingest.simulate({
    pipeline,
    docs: [
      {
        _index: 'index',
        _id: 'id',
        _source: doc,
      },
    ],
  });

  const timeFieldValue: string = resp.docs[0].doc!._source[timeField];
  const epoch = dateMath.parse(timeFieldValue)?.valueOf();
  if (epoch === undefined) {
    throw new Error(`Could not parse time field value '${timeFieldValue}'`);
  }

  return { time: { epoch, string: timeFieldValue } };
}

export async function previewIndexTimeRange1(
  client: IScopedClusterClient,
  timeField: string,
  pipeline: IngestPipeline,
  firstDoc: any,
  lastDoc: any
) {
  const [{ time: firstDocTime }, { time: lastDocTime }] = await Promise.all([
    getTimeFromDoc(client, timeField, firstDoc, pipeline),
    getTimeFromDoc(client, timeField, lastDoc, pipeline),
  ]);

  return {
    start: firstDocTime.epoch,
    end: lastDocTime.epoch,
  };
}

export async function previewIndexTimeRange(
  client: IScopedClusterClient,
  timeField: string,
  pipeline: IngestPipeline,
  docs: any[]
) {
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

  // const timeFieldValue: string = resp.docs[0].doc!._source[timeField];
  const timeFieldValues: string[] = resp.docs.map((doc) => doc.doc!._source[timeField]);
  const epochs: number[] = timeFieldValues
    .map((timeFieldValue) => dateMath.parse(timeFieldValue)?.valueOf())
    .filter((epoch) => epoch !== undefined) as number[];

  return {
    start: Math.min(...epochs),
    end: Math.max(...epochs),
  };
}

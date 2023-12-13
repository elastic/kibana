/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import moment from 'moment';

export async function getTimeFromDoc(
  client: IScopedClusterClient,
  timeField: string,
  doc: any,
  pipeline: any
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

  const timeField2 = resp.docs[0].doc!._source[timeField];

  return { time: { epoch: moment(timeField2).valueOf(), string: timeField2 } };
}

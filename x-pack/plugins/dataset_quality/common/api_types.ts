/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const datasetStatRt = rt.intersection([
  rt.type({
    name: rt.string,
  }),
  rt.partial({
    size: rt.string,
    sizeBytes: rt.number,
    lastActivity: rt.number,
    integration: rt.string,
  }),
]);

export const integrationIconRt = rt.intersection([
  rt.type({
    path: rt.string,
    src: rt.string,
  }),
  rt.partial({
    title: rt.string,
    size: rt.string,
    type: rt.string,
  }),
]);

export const integrationRt = rt.intersection([
  rt.type({
    name: rt.string,
  }),
  rt.partial({
    title: rt.string,
    version: rt.string,
    icons: rt.array(integrationIconRt),
  }),
]);

export const degradedDocsRt = rt.type({
  dataset: rt.string,
  percentage: rt.number,
});

export type DegradedDocs = rt.TypeOf<typeof degradedDocsRt>;

export const getDataStreamsStatsResponseRt = rt.exact(
  rt.intersection([
    rt.type({
      dataStreamsStats: rt.array(datasetStatRt),
    }),
    rt.type({
      integrations: rt.array(integrationRt),
    }),
  ])
);

export const getDataStreamsDegradedDocsStatsResponseRt = rt.exact(
  rt.type({
    degradedDocs: rt.array(degradedDocsRt),
  })
);

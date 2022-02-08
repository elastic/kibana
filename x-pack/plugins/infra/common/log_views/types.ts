/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { logSourceColumnConfigurationRT } from '../log_sources';

export const logViewOriginRT = rt.keyof({
  stored: null,
  internal: null,
  'infra-source-stored': null,
  'infra-source-internal': null,
  'infra-source-fallback': null,
});

// Kibana data views
export const logDataViewReferenceRT = rt.type({
  type: rt.literal('data_view'),
  indexPatternId: rt.string,
});

export type LogDataViewReference = rt.TypeOf<typeof logDataViewReferenceRT>;

// Index name
export const logIndexNameReferenceRT = rt.type({
  type: rt.literal('index_name'),
  indexName: rt.string,
});
export type LogIndexNameReference = rt.TypeOf<typeof logIndexNameReferenceRT>;

export const logIndexReferenceRT = rt.union([logDataViewReferenceRT, logIndexNameReferenceRT]);
export type LogIndexReference = rt.TypeOf<typeof logIndexReferenceRT>;

export const logViewAttributesRT = rt.strict({
  name: rt.string,
  description: rt.string,
  logIndices: logIndexReferenceRT,
  logColumns: rt.array(logSourceColumnConfigurationRT),
});
export type LogViewAttributes = rt.TypeOf<typeof logViewAttributesRT>;

export const logViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      origin: logViewOriginRT,
      attributes: logViewAttributesRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
    }),
  ])
);
export type LogView = rt.TypeOf<typeof logViewRT>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export interface LogViewsStaticConfig {
  messageFields: string[];
}

export const logViewOriginRT = rt.keyof({
  stored: null,
  internal: null,
  'infra-source-stored': null,
  'infra-source-internal': null,
  'infra-source-fallback': null,
});
export type LogViewOrigin = rt.TypeOf<typeof logViewOriginRT>;

// Kibana data views
export const logDataViewReferenceRT = rt.type({
  type: rt.literal('data_view'),
  dataViewId: rt.string,
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

const logViewCommonColumnConfigurationRT = rt.strict({
  id: rt.string,
});

const logViewTimestampColumnConfigurationRT = rt.strict({
  timestampColumn: logViewCommonColumnConfigurationRT,
});

const logViewMessageColumnConfigurationRT = rt.strict({
  messageColumn: logViewCommonColumnConfigurationRT,
});

export const logViewFieldColumnConfigurationRT = rt.strict({
  fieldColumn: rt.intersection([
    logViewCommonColumnConfigurationRT,
    rt.strict({
      field: rt.string,
    }),
  ]),
});

export const logViewColumnConfigurationRT = rt.union([
  logViewTimestampColumnConfigurationRT,
  logViewMessageColumnConfigurationRT,
  logViewFieldColumnConfigurationRT,
]);
export type LogViewColumnConfiguration = rt.TypeOf<typeof logViewColumnConfigurationRT>;

export const logViewAttributesRT = rt.strict({
  name: rt.string,
  description: rt.string,
  logIndices: logIndexReferenceRT,
  logColumns: rt.array(logViewColumnConfigurationRT),
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

export const logViewIndexStatusRT = rt.keyof({
  available: null,
  empty: null,
  missing: null,
  unknown: null,
});
export type LogViewIndexStatus = rt.TypeOf<typeof logViewIndexStatusRT>;

export const logViewStatusRT = rt.strict({
  index: logViewIndexStatusRT,
});
export type LogViewStatus = rt.TypeOf<typeof logViewStatusRT>;

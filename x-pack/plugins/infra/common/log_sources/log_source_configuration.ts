/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const logSourceConfigurationOriginRT = rt.keyof({
  fallback: null,
  internal: null,
  stored: null,
});

export type LogSourceConfigurationOrigin = rt.TypeOf<typeof logSourceConfigurationOriginRT>;

const logSourceFieldsConfigurationRT = rt.strict({
  message: rt.array(rt.string),
});

const logSourceCommonColumnConfigurationRT = rt.strict({
  id: rt.string,
});

const logSourceTimestampColumnConfigurationRT = rt.strict({
  timestampColumn: logSourceCommonColumnConfigurationRT,
});

const logSourceMessageColumnConfigurationRT = rt.strict({
  messageColumn: logSourceCommonColumnConfigurationRT,
});

export const logSourceFieldColumnConfigurationRT = rt.strict({
  fieldColumn: rt.intersection([
    logSourceCommonColumnConfigurationRT,
    rt.strict({
      field: rt.string,
    }),
  ]),
});

export const logSourceColumnConfigurationRT = rt.union([
  logSourceTimestampColumnConfigurationRT,
  logSourceMessageColumnConfigurationRT,
  logSourceFieldColumnConfigurationRT,
]);
export type LogSourceColumnConfiguration = rt.TypeOf<typeof logSourceColumnConfigurationRT>;

// Kibana index pattern
export const logIndexPatternReferenceRT = rt.type({
  type: rt.literal('index_pattern'),
  indexPatternId: rt.string,
});
export type LogIndexPatternReference = rt.TypeOf<typeof logIndexPatternReferenceRT>;

// Legacy support
export const logIndexNameReferenceRT = rt.type({
  type: rt.literal('index_name'),
  indexName: rt.string,
});
export type LogIndexNameReference = rt.TypeOf<typeof logIndexNameReferenceRT>;

export const logIndexReferenceRT = rt.union([logIndexPatternReferenceRT, logIndexNameReferenceRT]);
export type LogIndexReference = rt.TypeOf<typeof logIndexReferenceRT>;

export const logSourceConfigurationPropertiesRT = rt.strict({
  name: rt.string,
  description: rt.string,
  logIndices: logIndexReferenceRT,
  fields: logSourceFieldsConfigurationRT,
  logColumns: rt.array(logSourceColumnConfigurationRT),
});

export type LogSourceConfigurationProperties = rt.TypeOf<typeof logSourceConfigurationPropertiesRT>;

export const logSourceConfigurationRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      origin: logSourceConfigurationOriginRT,
      configuration: logSourceConfigurationPropertiesRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
    }),
  ])
);

export type LogSourceConfiguration = rt.TypeOf<typeof logSourceConfigurationRT>;

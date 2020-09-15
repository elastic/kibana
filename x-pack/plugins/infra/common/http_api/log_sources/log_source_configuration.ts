/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_SOURCE_CONFIGURATION_PATH_PREFIX = '/api/infra/log_source_configurations';
export const LOG_SOURCE_CONFIGURATION_PATH = `${LOG_SOURCE_CONFIGURATION_PATH_PREFIX}/{sourceId}`;
export const getLogSourceConfigurationPath = (sourceId: string) =>
  `${LOG_SOURCE_CONFIGURATION_PATH_PREFIX}/${sourceId}`;

export const logSourceConfigurationOriginRT = rt.keyof({
  fallback: null,
  internal: null,
  stored: null,
});

export type LogSourceConfigurationOrigin = rt.TypeOf<typeof logSourceConfigurationOriginRT>;

const logSourceFieldsConfigurationRT = rt.strict({
  container: rt.string,
  host: rt.string,
  pod: rt.string,
  timestamp: rt.string,
  tiebreaker: rt.string,
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

const logSourceFieldColumnConfigurationRT = rt.strict({
  fieldColumn: rt.intersection([
    logSourceCommonColumnConfigurationRT,
    rt.strict({
      field: rt.string,
    }),
  ]),
});

const logSourceColumnConfigurationRT = rt.union([
  logSourceTimestampColumnConfigurationRT,
  logSourceMessageColumnConfigurationRT,
  logSourceFieldColumnConfigurationRT,
]);

export const logSourceConfigurationPropertiesRT = rt.strict({
  name: rt.string,
  description: rt.string,
  logAlias: rt.string,
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

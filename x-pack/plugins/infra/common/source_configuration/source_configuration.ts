/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chain } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { omit } from 'lodash';
import moment from 'moment';
import { logIndexReferenceRT } from '../log_sources/log_source_configuration';

export const TimestampFromString = new rt.Type<number, string>(
  'TimestampFromString',
  (input): input is number => typeof input === 'number',
  (input, context) =>
    pipe(
      rt.string.validate(input, context),
      chain((stringInput) => {
        const momentValue = moment(stringInput);
        return momentValue.isValid()
          ? rt.success(momentValue.valueOf())
          : rt.failure(stringInput, context);
      })
    ),
  (output) => new Date(output).toISOString()
);

/**
 * Source configuration config file properties.
 * These are properties that can appear in the kibana.yml file.
 * This is a legacy method of providing properties, and will be deprecated in the future (v 8.0.0).
 */

export const sourceConfigurationConfigFilePropertiesRT = rt.type({
  sources: rt.type({
    default: rt.partial({
      logAlias: rt.string, // Cannot be deprecated until 8.0.0. Will be converted to an indexName reference.
      metricAlias: rt.string,
      fields: rt.partial({
        timestamp: rt.string,
        message: rt.array(rt.string),
        tiebreaker: rt.string,
        host: rt.string,
        container: rt.string,
        pod: rt.string,
      }),
    }),
  }),
});

export type SourceConfigurationConfigFileProperties = rt.TypeOf<
  typeof sourceConfigurationConfigFilePropertiesRT
>;

/**
 * Log columns
 */

export const SourceConfigurationTimestampColumnRuntimeType = rt.type({
  timestampColumn: rt.type({
    id: rt.string,
  }),
});

export type InfraSourceConfigurationTimestampColumn = rt.TypeOf<
  typeof SourceConfigurationTimestampColumnRuntimeType
>;

export const SourceConfigurationMessageColumnRuntimeType = rt.type({
  messageColumn: rt.type({
    id: rt.string,
  }),
});

export type InfraSourceConfigurationMessageColumn = rt.TypeOf<
  typeof SourceConfigurationMessageColumnRuntimeType
>;

export const SourceConfigurationFieldColumnRuntimeType = rt.type({
  fieldColumn: rt.type({
    id: rt.string,
    field: rt.string,
  }),
});

export type InfraSourceConfigurationFieldColumn = rt.TypeOf<
  typeof SourceConfigurationFieldColumnRuntimeType
>;

export const SourceConfigurationColumnRuntimeType = rt.union([
  SourceConfigurationTimestampColumnRuntimeType,
  SourceConfigurationMessageColumnRuntimeType,
  SourceConfigurationFieldColumnRuntimeType,
]);

export type InfraSourceConfigurationColumn = rt.TypeOf<typeof SourceConfigurationColumnRuntimeType>;

/**
 * Fields
 */

const SourceConfigurationFieldsRT = rt.type({
  container: rt.string,
  host: rt.string,
  pod: rt.string,
  tiebreaker: rt.string,
  timestamp: rt.string,
  message: rt.array(rt.string),
});

/**
 * Properties that represent a full source configuration, which is the result of merging static values with
 * saved values.
 */
export const SourceConfigurationRT = rt.type({
  name: rt.string,
  description: rt.string,
  metricAlias: rt.string,
  logIndices: logIndexReferenceRT,
  inventoryDefaultView: rt.string,
  metricsExplorerDefaultView: rt.string,
  fields: SourceConfigurationFieldsRT,
  logColumns: rt.array(SourceConfigurationColumnRuntimeType),
  anomalyThreshold: rt.number,
});

/**
 * Stored source configuration as read from and written to saved objects
 */
const SavedSourceConfigurationFieldsRuntimeType = rt.partial(
  omit(SourceConfigurationFieldsRT.props, ['message'])
);

export type InfraSavedSourceConfigurationFields = rt.TypeOf<
  typeof SavedSourceConfigurationFieldsRuntimeType
>;

export const SavedSourceConfigurationRuntimeType = rt.intersection([
  rt.partial(omit(SourceConfigurationRT.props, ['fields'])),
  rt.partial({
    fields: SavedSourceConfigurationFieldsRuntimeType,
  }),
]);

export type InfraSavedSourceConfiguration = rt.TypeOf<typeof SavedSourceConfigurationRuntimeType>;

/**
 * Static source configuration, the result of merging values from the config file and
 * hardcoded defaults.
 */

const StaticSourceConfigurationFieldsRuntimeType = rt.partial(SourceConfigurationFieldsRT.props);
export const StaticSourceConfigurationRuntimeType = rt.partial({
  ...SourceConfigurationRT.props,
  fields: StaticSourceConfigurationFieldsRuntimeType,
});

export type InfraStaticSourceConfiguration = rt.TypeOf<typeof StaticSourceConfigurationRuntimeType>;

/**
 * Full source configuration type after all cleanup has been done at the edges
 */

export type InfraSourceConfigurationFields = rt.TypeOf<typeof SourceConfigurationFieldsRT>;

export const SourceConfigurationRuntimeType = rt.type({
  ...SourceConfigurationRT.props,
  fields: SourceConfigurationFieldsRT,
  logColumns: rt.array(SourceConfigurationColumnRuntimeType),
});

export type InfraSourceConfiguration = rt.TypeOf<typeof SourceConfigurationRuntimeType>;

/**
 * Source status
 */
const SourceStatusFieldRuntimeType = rt.type({
  name: rt.string,
  type: rt.string,
  searchable: rt.boolean,
  aggregatable: rt.boolean,
  displayable: rt.boolean,
});

export type InfraSourceIndexField = rt.TypeOf<typeof SourceStatusFieldRuntimeType>;

export const SourceStatusRuntimeType = rt.type({
  logIndicesExist: rt.boolean,
  metricIndicesExist: rt.boolean,
  indexFields: rt.array(SourceStatusFieldRuntimeType),
});

export type InfraSourceStatus = rt.TypeOf<typeof SourceStatusRuntimeType>;

/**
 * Source configuration along with source status and metadata
 */
export const SourceRuntimeType = rt.intersection([
  rt.type({
    id: rt.string,
    origin: rt.keyof({
      fallback: null,
      internal: null,
      stored: null,
    }),
    configuration: SourceConfigurationRuntimeType,
  }),
  rt.partial({
    version: rt.string,
    updatedAt: rt.number,
    status: SourceStatusRuntimeType,
  }),
]);

export type InfraSource = rt.TypeOf<typeof SourceRuntimeType>;

export const SourceResponseRuntimeType = rt.type({
  source: SourceRuntimeType,
});

export type SourceResponse = rt.TypeOf<typeof SourceResponseRuntimeType>;

/**
 * Saved object type with metadata
 */

export const SourceConfigurationSavedObjectRuntimeType = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: SavedSourceConfigurationRuntimeType,
  }),
  rt.partial({
    version: rt.string,
    updated_at: TimestampFromString,
  }),
]);

export type SourceConfigurationSavedObject = rt.TypeOf<
  typeof SourceConfigurationSavedObjectRuntimeType
>;

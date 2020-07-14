/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as rt from 'io-ts';
import moment from 'moment';
import { pipe } from 'fp-ts/lib/pipeable';
import { chain } from 'fp-ts/lib/Either';

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
 * Stored source configuration as read from and written to saved objects
 */

const SavedSourceConfigurationFieldsRuntimeType = rt.partial({
  container: rt.string,
  host: rt.string,
  pod: rt.string,
  tiebreaker: rt.string,
  timestamp: rt.string,
});

export const SavedSourceConfigurationTimestampColumnRuntimeType = rt.type({
  timestampColumn: rt.type({
    id: rt.string,
  }),
});

export const SavedSourceConfigurationMessageColumnRuntimeType = rt.type({
  messageColumn: rt.type({
    id: rt.string,
  }),
});

export const SavedSourceConfigurationFieldColumnRuntimeType = rt.type({
  fieldColumn: rt.type({
    id: rt.string,
    field: rt.string,
  }),
});

export const SavedSourceConfigurationColumnRuntimeType = rt.union([
  SavedSourceConfigurationTimestampColumnRuntimeType,
  SavedSourceConfigurationMessageColumnRuntimeType,
  SavedSourceConfigurationFieldColumnRuntimeType,
]);

export const SavedSourceConfigurationRuntimeType = rt.partial({
  name: rt.string,
  description: rt.string,
  metricAlias: rt.string,
  logAlias: rt.string,
  inventoryDefaultView: rt.string,
  metricsExplorerDefaultView: rt.string,
  fields: SavedSourceConfigurationFieldsRuntimeType,
  logColumns: rt.array(SavedSourceConfigurationColumnRuntimeType),
});

export interface InfraSavedSourceConfiguration
  extends rt.TypeOf<typeof SavedSourceConfigurationRuntimeType> {}

export const pickSavedSourceConfiguration = (
  value: InfraSourceConfiguration
): InfraSavedSourceConfiguration => {
  const {
    name,
    description,
    metricAlias,
    logAlias,
    fields,
    inventoryDefaultView,
    metricsExplorerDefaultView,
    logColumns,
  } = value;
  const { container, host, pod, tiebreaker, timestamp } = fields;

  return {
    name,
    description,
    metricAlias,
    logAlias,
    inventoryDefaultView,
    metricsExplorerDefaultView,
    fields: { container, host, pod, tiebreaker, timestamp },
    logColumns,
  };
};

/**
 * Static source configuration as read from the configuration file
 */

const StaticSourceConfigurationFieldsRuntimeType = rt.partial({
  ...SavedSourceConfigurationFieldsRuntimeType.props,
  message: rt.array(rt.string),
});

export const StaticSourceConfigurationRuntimeType = rt.partial({
  name: rt.string,
  description: rt.string,
  metricAlias: rt.string,
  logAlias: rt.string,
  inventoryDefaultView: rt.string,
  metricsExplorerDefaultView: rt.string,
  fields: StaticSourceConfigurationFieldsRuntimeType,
  logColumns: rt.array(SavedSourceConfigurationColumnRuntimeType),
});

export interface InfraStaticSourceConfiguration
  extends rt.TypeOf<typeof StaticSourceConfigurationRuntimeType> {}

/**
 * Full source configuration type after all cleanup has been done at the edges
 */

const SourceConfigurationFieldsRuntimeType = rt.type({
  ...StaticSourceConfigurationFieldsRuntimeType.props,
});

export const SourceConfigurationRuntimeType = rt.type({
  ...SavedSourceConfigurationRuntimeType.props,
  fields: SourceConfigurationFieldsRuntimeType,
  logColumns: rt.array(SavedSourceConfigurationColumnRuntimeType),
});

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
  }),
]);

export interface InfraSourceConfiguration
  extends rt.TypeOf<typeof SourceConfigurationRuntimeType> {}

export interface InfraSource extends rt.TypeOf<typeof SourceRuntimeType> {}

const SourceStatusFieldRuntimeType = rt.type({
  name: rt.string,
  type: rt.string,
  searchable: rt.boolean,
  aggregatable: rt.boolean,
  displayable: rt.boolean,
});

const SourceStatusRuntimeType = rt.type({
  logIndicesExist: rt.boolean,
  metricIndicesExist: rt.boolean,
  indexFields: rt.array(SourceStatusFieldRuntimeType),
});

export const SourceResponseRuntimeType = rt.type({
  source: SourceRuntimeType,
  status: SourceStatusRuntimeType,
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

export interface SourceConfigurationSavedObject
  extends rt.TypeOf<typeof SourceConfigurationSavedObjectRuntimeType> {}

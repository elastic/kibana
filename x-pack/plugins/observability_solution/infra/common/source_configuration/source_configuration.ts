/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * These are the core source configuration types that represent a Source Configuration in
 * it's entirety. There are then subsets of this configuration that form the Logs Source Configuration
 * and Metrics Source Configuration. The Logs Source Configuration is further expanded to it's resolved form.
 * -> Source Configuration
 *  -> Logs source configuration
 *    -> Resolved Logs Source Configuration
 *  -> Metrics Source Configuration
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as rt from 'io-ts';

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
 * Log indices
 */

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

export const SourceConfigurationRT = rt.type({
  name: rt.string,
  description: rt.string,
  metricAlias: rt.string,
  logIndices: logIndexReferenceRT,
  inventoryDefaultView: rt.string,
  metricsExplorerDefaultView: rt.string,
  logColumns: rt.array(SourceConfigurationColumnRuntimeType),
  anomalyThreshold: rt.number,
});

/**
 * Stored source configuration as read from and written to saved objects
 */

export const SavedSourceConfigurationRuntimeType = rt.partial(SourceConfigurationRT.props);

export interface InfraSavedSourceConfiguration
  extends rt.TypeOf<typeof SavedSourceConfigurationRuntimeType> {}

/**
 * Static source configuration, the result of merging values from the config file and
 * hardcoded defaults.
 */

export const StaticSourceConfigurationRuntimeType = rt.partial({
  ...SourceConfigurationRT.props,
});

export interface InfraStaticSourceConfiguration
  extends rt.TypeOf<typeof StaticSourceConfigurationRuntimeType> {}

/**
 * Full source configuration type after all cleanup has been done at the edges
 */

export const SourceConfigurationRuntimeType = rt.type({
  ...SourceConfigurationRT.props,
  logColumns: rt.array(SourceConfigurationColumnRuntimeType),
});

export interface InfraSourceConfiguration
  extends rt.TypeOf<typeof SourceConfigurationRuntimeType> {}

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
  remoteClustersExist: rt.boolean,
  indexFields: rt.array(SourceStatusFieldRuntimeType),
});

export interface InfraSourceStatus extends rt.TypeOf<typeof SourceStatusRuntimeType> {}

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

export interface InfraSource extends rt.TypeOf<typeof SourceRuntimeType> {}

export const SourceResponseRuntimeType = rt.type({
  source: SourceRuntimeType,
});

export type SourceResponse = rt.TypeOf<typeof SourceResponseRuntimeType>;

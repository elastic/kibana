/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  SourceConfigurationRT,
  SourceStatusRuntimeType,
} from '../source_configuration/source_configuration';
import { DeepPartial } from '../utility_types';

/**
 * Properties specific to the Metrics Source Configuration.
 */
export const metricsSourceConfigurationPropertiesRT = rt.strict({
  name: SourceConfigurationRT.props.name,
  description: SourceConfigurationRT.props.description,
  metricAlias: SourceConfigurationRT.props.metricAlias,
  inventoryDefaultView: SourceConfigurationRT.props.inventoryDefaultView,
  metricsExplorerDefaultView: SourceConfigurationRT.props.metricsExplorerDefaultView,
  anomalyThreshold: rt.number,
});

export type MetricsSourceConfigurationProperties = rt.TypeOf<
  typeof metricsSourceConfigurationPropertiesRT
>;

export const partialMetricsSourceConfigurationPropertiesRT = rt.partial({
  ...metricsSourceConfigurationPropertiesRT.type.props,
});

export type PartialMetricsSourceConfigurationProperties = rt.TypeOf<
  typeof partialMetricsSourceConfigurationPropertiesRT
>;

const metricsSourceConfigurationOriginRT = rt.keyof({
  fallback: null,
  internal: null,
  stored: null,
});

export const metricsSourceStatusRT = rt.strict({
  metricIndicesExist: SourceStatusRuntimeType.props.metricIndicesExist,
  indexFields: SourceStatusRuntimeType.props.indexFields,
});

export type MetricsSourceStatus = rt.TypeOf<typeof metricsSourceStatusRT>;

export const metricsSourceConfigurationRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      origin: metricsSourceConfigurationOriginRT,
      configuration: metricsSourceConfigurationPropertiesRT,
    }),
    rt.partial({
      updatedAt: rt.number,
      version: rt.string,
      status: metricsSourceStatusRT,
    }),
  ])
);

export type MetricsSourceConfiguration = rt.TypeOf<typeof metricsSourceConfigurationRT>;
export type PartialMetricsSourceConfiguration = DeepPartial<MetricsSourceConfiguration>;

export const metricsSourceConfigurationResponseRT = rt.type({
  source: metricsSourceConfigurationRT,
});

export type MetricsSourceConfigurationResponse = rt.TypeOf<
  typeof metricsSourceConfigurationResponseRT
>;

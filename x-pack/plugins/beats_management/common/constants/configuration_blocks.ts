/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ConfigurationBlockTypes {
  FilebeatInputs = 'filebeat.inputs',
  FilebeatModules = 'filebeat.modules',
  MetricbeatModules = 'metricbeat.modules',
  Output = 'output',
  Processors = 'processors',
}

export const UNIQUENESS_ENFORCING_TYPES = [ConfigurationBlockTypes.Output];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface InfraConfigurationAdapter<
  Configuration extends InfraBaseConfiguration = InfraBaseConfiguration
> {
  get(): Promise<Configuration>;
}

export interface InfraBaseConfiguration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
}

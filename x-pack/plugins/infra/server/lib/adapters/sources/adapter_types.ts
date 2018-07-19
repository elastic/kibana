/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface InfraSourcesAdapter {
  get(sourceId: string): Promise<InfraSourceConfiguration>;
  getAll(): Promise<InfraSourceConfigurations>;
}

export interface InfraSourceConfiguration {
  metricAlias: string;
  logAlias: string;
  fields: {
    container: string;
    hostname: string;
    message: string[];
    pod: string;
    tiebreaker: string;
    timestamp: string;
  };
}

export interface InfraSourceConfigurations {
  [sourceId: string]: InfraSourceConfiguration;
}

export type PartialInfraSourceConfigurations = {
  default?: PartialInfraDefaultSourceConfiguration;
} & {
  [sourceId: string]: PartialInfraSourceConfiguration;
};

export type PartialInfraDefaultSourceConfiguration = {
  fields?: Partial<InfraSourceConfiguration['fields']>;
} & Partial<Pick<InfraSourceConfiguration, Exclude<keyof InfraSourceConfiguration, 'fields'>>>;

export type PartialInfraSourceConfiguration = {
  fields?: Partial<InfraSourceConfiguration['fields']>;
} & Pick<InfraSourceConfiguration, Exclude<keyof InfraSourceConfiguration, 'fields'>>;

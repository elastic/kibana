/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../sources';

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

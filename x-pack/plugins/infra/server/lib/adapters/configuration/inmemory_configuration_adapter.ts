/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraConfigurationAdapter } from './adapter_types';

export class InfraInmemoryConfigurationAdapter<Configuration>
  implements InfraConfigurationAdapter<Configuration> {
  constructor(private readonly configuration: Configuration) {}

  public async get() {
    return this.configuration;
  }
}

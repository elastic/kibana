/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraApiAdapter, InfraField, InfraFrameworkAdapter } from '../lib';

export class InfraFieldsDomain {
  private api: InfraApiAdapter;
  private framework: InfraFrameworkAdapter;

  constructor(api: InfraApiAdapter, framework: InfraFrameworkAdapter) {
    this.framework = framework;
    this.api = api;
  }

  public async getFields(): Promise<InfraField[]> {
    const dateFormat = this.framework.dateFormat;
    const fields = await this.api.get<InfraField[]>(`/fields?dateFormat=${dateFormat}`);
    return fields;
  }
}

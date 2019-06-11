/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest, RequestBasicOptions } from '../framework';

import { KpiHostsAdapter, KpiHostsMappedData } from './types';

export class KpiHosts {
  constructor(private readonly adapter: KpiHostsAdapter) {}

  public async getKpiHosts(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsMappedData> {
    return await this.adapter.getKpiHosts(req, options);
  }
}

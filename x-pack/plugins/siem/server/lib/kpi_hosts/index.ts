/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiHostsData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';

import { KpiHostsAdapter } from './types';

export class KpiHosts {
  constructor(private readonly adapter: KpiHostsAdapter) {}

  public async getKpiHosts(
    req: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsData> {
    return await this.adapter.getKpiHosts(req, options);
  }
}

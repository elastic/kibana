/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UncommonProcessesData } from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
export * from './elasticsearch_adapter';
import { UncommonProcessesAdapter } from './types';

export class UncommonProcesses {
  constructor(private readonly adapter: UncommonProcessesAdapter) {}

  public async getUncommonProcesses(
    req: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<UncommonProcessesData> {
    return this.adapter.getUncommonProcesses(req, options);
  }
}

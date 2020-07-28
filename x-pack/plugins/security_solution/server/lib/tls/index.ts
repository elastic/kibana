/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTargetSourceDest, TlsSortField, TlsData } from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';

import { TlsAdapter } from './types';

export * from './elasticsearch_adapter';

export interface TlsRequestOptions extends RequestOptionsPaginated {
  ip?: string;
  sort: TlsSortField;
  flowTarget: FlowTargetSourceDest;
}

export class TLS {
  constructor(private readonly adapter: TlsAdapter) {}

  public async getTls(req: FrameworkRequest, options: TlsRequestOptions): Promise<TlsData> {
    return this.adapter.getTls(req, options);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
export { ElasticsearchSourceStatusAdapter } from './elasticsearch_adapter';

export class SourceStatus {
  constructor(private readonly adapter: SourceStatusAdapter) {}

  public async hasIndices(request: FrameworkRequest, indexes: string[]): Promise<boolean> {
    return this.adapter.hasIndices(request, indexes);
  }
}

export interface SourceStatusAdapter {
  hasIndices(request: FrameworkRequest, indexNames: string[]): Promise<boolean>;
}

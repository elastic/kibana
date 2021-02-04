/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldsAdapter } from './types';
import { FrameworkRequest } from '../framework';
export { ElasticsearchIndexFieldAdapter } from './elasticsearch_adapter';

export class IndexFields {
  constructor(private readonly adapter: FieldsAdapter) {}

  // Deprecated until we delete all the code
  public async getFields(request: FrameworkRequest, defaultIndex: string[]): Promise<string[]> {
    return this.adapter.getIndexFields(request, defaultIndex);
  }
}

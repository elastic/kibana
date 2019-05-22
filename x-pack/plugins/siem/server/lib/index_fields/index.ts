/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexField } from '../../graphql/types';
import { FrameworkRequest } from '../framework';

import { FieldsAdapter } from './types';
export { ElasticsearchIndexFieldAdapter } from './elasticsearch_adapter';

export class IndexFields {
  constructor(private readonly adapter: FieldsAdapter) {}

  public async getFields(request: FrameworkRequest, defaultIndex: string[]): Promise<IndexField[]> {
    return this.adapter.getIndexFields(request, defaultIndex);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexField } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { FieldsAdapter } from './types';

export class ElasticsearchIndexFieldAdapter implements FieldsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIndexFields(request: FrameworkRequest, indices: string[]): Promise<IndexField[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(request);
    return await indexPatternsService.getFieldsForWildcard({
      pattern: indices,
    });
  }
}

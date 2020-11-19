/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
import { FieldsAdapter } from './types';

export class ElasticsearchIndexFieldAdapter implements FieldsAdapter {
  // Deprecated until we delete all the code
  public async getIndexFields(request: FrameworkRequest, indices: string[]): Promise<string[]> {
    return Promise.resolve(['deprecated']);
  }
}

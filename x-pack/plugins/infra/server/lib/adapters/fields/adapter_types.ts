/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';

export interface FieldsAdapter {
  getIndexFields(
    requestContext: RequestHandlerContext,
    indices: string
  ): Promise<IndexFieldDescriptor[]>;
}

export interface IndexFieldDescriptor {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
  displayable: boolean;
}

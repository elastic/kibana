/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraPluginRequestHandlerContext } from '../../types';
import { FieldsAdapter, IndexFieldDescriptor } from '../adapters/fields';

export class InfraFieldsDomain {
  constructor(private readonly adapter: FieldsAdapter) {}

  public async getFields(
    requestContext: InfraPluginRequestHandlerContext,
    indexPattern: string
  ): Promise<IndexFieldDescriptor[]> {
    return this.adapter.getIndexFields(requestContext, indexPattern);
  }
}

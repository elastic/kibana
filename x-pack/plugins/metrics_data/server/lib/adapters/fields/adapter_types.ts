/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraPluginRequestHandlerContext } from '../../../types';

export interface FieldsAdapter {
  getIndexFields(
    requestContext: InfraPluginRequestHandlerContext,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getIndexFields(
    requestContext: RequestHandlerContext,
    indices: string
  ): Promise<IndexFieldDescriptor[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(requestContext);
    const response = await indexPatternsService.getFieldsForWildcard({
      pattern: indices,
    });
    return response.map(field => ({
      ...field,
      displayable: true,
    }));
  }
}

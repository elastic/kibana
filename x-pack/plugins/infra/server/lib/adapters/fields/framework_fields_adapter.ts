/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';
import { getIndexFieldsCache } from '../../caches';

const createCacheKeyForIndicesWithSpaces = (indices: string, spaceId: string) =>
  `${spaceId}:${indices}`;

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getIndexFields(
    requestContext: RequestHandlerContext,
    indices: string
  ): Promise<IndexFieldDescriptor[]> {
    const cacheKey = createCacheKeyForIndicesWithSpaces(
      indices,
      requestContext.infra?.spaceId || 'default'
    );
    if (getIndexFieldsCache.has(cacheKey)) {
      return getIndexFieldsCache.get(cacheKey) as IndexFieldDescriptor[];
    }
    const indexPatternsService = this.framework.getIndexPatternsService(requestContext);
    const response = await indexPatternsService.getFieldsForWildcard({
      pattern: indices,
    });
    const fields = response.map((field) => ({
      ...field,
      displayable: true,
    }));
    getIndexFieldsCache.set(cacheKey, fields);
    return fields;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: InfraBackendFrameworkAdapter;

  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getIndexFields(
    request: InfraFrameworkRequest,
    indices: string[]
  ): Promise<IndexFieldDescriptor[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(request);
    const IndexFieldResponses = await Promise.all(
      indices.map(indice =>
        indexPatternsService.getFieldsForWildcard({ pattern: indice }).catch(error => {
          if (error && error.output && error.output.statusCode === 404) {
            return [];
          }
          throw error;
        })
      )
    );
    return IndexFieldResponses.reduce(
      (indexFields, indexFieldResponse) => [...indexFields, ...indexFieldResponse],
      [] as IndexFieldDescriptor[]
    );
  }
}

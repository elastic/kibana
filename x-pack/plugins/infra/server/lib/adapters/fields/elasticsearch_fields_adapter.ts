/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { FieldCapsResponse, FieldsAdapter } from './adapter_types';

export class ElasticsearchFieldsAdapter implements FieldsAdapter {
  private framework: InfraBackendFrameworkAdapter;

  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getFieldCaps(
    req: InfraFrameworkRequest,
    indexPattern: string | string[]
  ): Promise<FieldCapsResponse> {
    return await this.framework.callWithRequest(req, 'fieldCaps', {
      allowNoIndices: false,
      fields: '*',
      ignoreUnavailable: false,
      index: indexPattern,
    });
  }
}

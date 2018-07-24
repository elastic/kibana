/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceStatusAdapter } from '../../source_status';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';

export class InfraElasticsearchSourceStatusAdapter implements InfraSourceStatusAdapter {
  constructor(private readonly framework: InfraBackendFrameworkAdapter) {}

  public async getIndexNames(request: InfraFrameworkRequest, aliasName: string) {
    const indexMap = await this.framework
      .callWithRequest(request, 'indices.getAlias', {
        name: aliasName,
      })
      .catch(error => {
        if (error.status === 404) {
          return {};
        }
        throw error;
      });

    const indexNames = Object.keys(indexMap);

    return indexNames;
  }

  public async hasAlias(request: InfraFrameworkRequest, aliasName: string) {
    return await this.framework.callWithRequest(request, 'indices.existsAlias', {
      name: aliasName,
    });
  }
}

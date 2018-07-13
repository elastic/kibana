/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkRequest, InfraNodeRequestOptions, InfraNodesAdapter } from '../infra_types';

import { InfraResponse } from '../../../common/graphql/types';

export class InfraNodesDomain {
  private adapter: InfraNodesAdapter;

  constructor(adapter: InfraNodesAdapter) {
    this.adapter = adapter;
  }

  public async getNodes(
    req: InfraFrameworkRequest,
    options: InfraNodeRequestOptions
  ): Promise<InfraResponse> {
    return await this.adapter.getNodes(req, options);
  }
}

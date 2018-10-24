/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNode } from '../../../common/graphql/types';
import { InfraFrameworkRequest } from '../adapters/framework';
import { InfraNodeRequestOptions, InfraNodesAdapter } from '../adapters/nodes';

export class InfraNodesDomain {
  private adapter: InfraNodesAdapter;

  constructor(adapter: InfraNodesAdapter) {
    this.adapter = adapter;
  }

  public async getNodes(
    req: InfraFrameworkRequest,
    options: InfraNodeRequestOptions
  ): Promise<InfraNode[]> {
    return await this.adapter.getNodes(req, options);
  }
}

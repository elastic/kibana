/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { AnyObject } from '../lib/esqueue';

export class WithRequest {
  public readonly callWithRequest: (endpoint: string, clientOptions?: AnyObject) => Promise<any>;

  constructor(readonly req: Request) {
    this.callWithRequest = req.server.plugins.elasticsearch
      .getCluster('data')
      .callWithRequest.bind(null, req);
  }
}

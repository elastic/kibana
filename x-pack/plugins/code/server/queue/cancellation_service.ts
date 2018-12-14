/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from '../../model';
import { CancellationToken } from '../lib/esqueue';

export class CancellationSerivce {
  // TODO: Add clone/update cancellation map.
  private indexCancellationMap: Map<RepositoryUri, CancellationToken>;

  constructor() {
    this.indexCancellationMap = new Map<RepositoryUri, CancellationToken>();
  }

  public cancelIndexJob(repoUri: RepositoryUri) {
    const token = this.indexCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
      this.indexCancellationMap.delete(repoUri);
    }
  }

  public registerIndexJobToken(repoUri: RepositoryUri, cancellationToken: CancellationToken) {
    const token = this.indexCancellationMap.get(repoUri);
    if (token) {
      token.cancel();
    }
    this.indexCancellationMap.set(repoUri, cancellationToken);
  }
}

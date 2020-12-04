/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { AppClient as SecurityClient } from '../../../../security_solution/server';

export class AlertService {
  constructor(
    private readonly esClient: IScopedClusterClient,
    private readonly securityClient: SecurityClient
  ) {}

  // TODO: When https://github.com/elastic/kibana/pull/84321 is merged change the type of status to CaseStatuses
  public async updateAlerts(ids: string[], status: string) {
    const result = await this.esClient.asCurrentUser.updateByQuery({
      index: this.securityClient.getSignalsIndex(),
      conflicts: 'abort',
      body: {
        script: {
          source: `ctx._source.signal.status = '${status}'`,
          lang: 'painless',
        },
        query: { ids: { values: ids } },
      },
      ignore_unavailable: true,
    });

    return result;
  }
}

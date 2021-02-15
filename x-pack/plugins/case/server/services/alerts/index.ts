/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import { IClusterClient, KibanaRequest } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';

export type AlertServiceContract = PublicMethodsOf<AlertService>;

interface UpdateAlertsStatusArgs {
  request: KibanaRequest;
  ids: string[];
  status: CaseStatuses;
  index: string;
}

export class AlertService {
  private isInitialized = false;
  private esClient?: IClusterClient;

  constructor() {}

  public initialize(esClient: IClusterClient) {
    if (this.isInitialized) {
      throw new Error('AlertService already initialized');
    }

    this.isInitialized = true;
    this.esClient = esClient;
  }

  public async updateAlertsStatus({ request, ids, status, index }: UpdateAlertsStatusArgs) {
    if (!this.isInitialized) {
      throw new Error('AlertService not initialized');
    }

    // The above check makes sure that esClient is defined.
    const result = await this.esClient!.asScoped(request).asCurrentUser.updateByQuery({
      index,
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

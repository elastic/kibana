/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import { IClusterClient, KibanaRequest } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';

export type AlertServiceContract = PublicMethodsOf<AlertService>;

interface UpdateAlertsStatusArgs {
  request: KibanaRequest;
  ids: string[];
  status: CaseStatuses;
  indices: Set<string>;
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

  public async updateAlertsStatus({ request, ids, status, indices }: UpdateAlertsStatusArgs) {
    if (!this.isInitialized) {
      throw new Error('AlertService not initialized');
    }

    /**
     * remove empty strings from the indices, I'm not sure how likely this is but in the case that
     * the document doesn't have _index set the security_solution code sets the value to an empty string
     * instead
     */
    const sanitizedIndices = [...indices].filter((index) => index !== '');
    if (sanitizedIndices.length <= 0) {
      throw new Error('No valid indices found to update the alerts status');
    }

    // The above check makes sure that esClient is defined.
    const result = await this.esClient!.asScoped(request).asCurrentUser.updateByQuery({
      index: sanitizedIndices,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import { ElasticsearchClient } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';

export type AlertServiceContract = PublicMethodsOf<AlertService>;

interface UpdateAlertsStatusArgs {
  ids: string[];
  status: CaseStatuses;
  indices: Set<string>;
  scopedClusterClient: ElasticsearchClient;
}

interface GetAlertsArgs {
  ids: string[];
  indices: Set<string>;
  scopedClusterClient: ElasticsearchClient;
}

interface Alert {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface AlertsResponse {
  hits: {
    hits: Alert[];
  };
}

export class AlertService {
  constructor() {}

  public async updateAlertsStatus({
    ids,
    status,
    indices,
    scopedClusterClient,
  }: UpdateAlertsStatusArgs) {
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
    const result = await scopedClusterClient.updateByQuery({
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

  public async getAlerts({
    scopedClusterClient,
    ids,
    indices,
  }: GetAlertsArgs): Promise<AlertsResponse> {
    // The above check makes sure that esClient is defined.
    const result = await scopedClusterClient.search<AlertsResponse>({
      index: [...indices].filter((index) => index !== ''),
      body: {
        query: {
          bool: {
            filter: {
              bool: {
                should: ids.map((_id) => ({ match: { _id } })),
                minimum_should_match: 1,
              },
            },
          },
        },
      },
      ignore_unavailable: true,
    });

    return result.body;
  }
}

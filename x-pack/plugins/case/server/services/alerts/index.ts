/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import type { PublicMethodsOf } from '@kbn/utility-types';

import { ElasticsearchClient } from 'kibana/server';
import { CaseStatuses } from '../../../common/api';
import { MAX_ALERTS_PER_SUB_CASE } from '../../../common/constants';

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

/**
 * remove empty strings from the indices, I'm not sure how likely this is but in the case that
 * the document doesn't have _index set the security_solution code sets the value to an empty string
 * instead
 */
function getValidIndices(indices: Set<string>): string[] {
  return [...indices].filter((index) => !_.isEmpty(index));
}

export class AlertService {
  constructor() {}

  public async updateAlertsStatus({
    ids,
    status,
    indices,
    scopedClusterClient,
  }: UpdateAlertsStatusArgs) {
    const sanitizedIndices = getValidIndices(indices);
    if (sanitizedIndices.length <= 0) {
      // log that we only had invalid indices
      return;
    }

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
  }: GetAlertsArgs): Promise<AlertsResponse | undefined> {
    const index = getValidIndices(indices);
    if (index.length <= 0) {
      return;
    }

    const result = await scopedClusterClient.search<AlertsResponse>({
      index,
      body: {
        query: {
          bool: {
            filter: {
              ids: {
                values: ids,
              },
            },
          },
        },
      },
      size: MAX_ALERTS_PER_SUB_CASE,
      ignore_unavailable: true,
    });

    return result.body;
  }
}

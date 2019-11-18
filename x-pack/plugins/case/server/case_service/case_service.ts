/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, Logger } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { Case } from '../routes/api/types';

interface CaseAggregationResponse {
  hits: {
    total: { value: number };
  };
  aggregations: {
    [aggName: string]: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

export interface CaseServiceInterface {
  getAllCases(): Promise<SearchResponse<CaseAggregationResponse>>;
  getCase(id: string): Promise<CaseAggregationResponse>;
  postCase(newCase: Case): Promise<CaseAggregationResponse>;
}

export class CaseService implements CaseServiceInterface {
  constructor(
    private readonly callDataCluster: APICaller,
    private readonly caseIndex: string[] | string,
    private readonly log: Logger
  ) {}

  async getAllCases() {
    this.log.debug(`CaseService - getAllCases`);
    return await this.callDataCluster<CaseAggregationResponse>('search', {
      index: this.caseIndex,
      body: {
        track_total_hits: true,
        query: {
          term: {
            state: {
              value: 'open',
            },
          },
        },
      },
    });
  }

  async getCase(id: string) {
    this.log.debug(`CaseService - getCase/${id}`);
    return await this.callDataCluster<CaseAggregationResponse>('get', {
      index: this.caseIndex,
      id,
    });
  }

  async postCase(newCase: Case) {
    this.log.debug(`CaseService - postCase:`, newCase);
    console.log('BLARG', newCase);
    return await this.callDataCluster<CaseAggregationResponse>('create', {
      index: this.caseIndex,
      ...newCase,
    });
  }
}

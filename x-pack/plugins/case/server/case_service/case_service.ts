/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, Logger } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { NewCaseWithDate, UpdatedCaseWithDate } from '../routes/api/types';

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
  postCase(newCase: NewCaseWithDate): Promise<CaseAggregationResponse>;
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

  async postCase(newCase: NewCaseWithDate) {
    this.log.debug(`CaseService - postCase:`, newCase);
    return await this.callDataCluster<CaseAggregationResponse>('index', {
      index: this.caseIndex,
      body: newCase,
    });
  }

  async updateCase(updatedCase: UpdatedCaseWithDate, id: string) {
    this.log.debug(`CaseService - updateCase:`, updatedCase);
    return await this.callDataCluster<CaseAggregationResponse>('update', {
      index: this.caseIndex,
      id,
      body: { doc: updatedCase },
    });
  }
}

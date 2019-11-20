/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, Logger } from 'kibana/server';
import { CreateDocumentResponse, GetResponse, SearchResponse } from 'elasticsearch';
import { NewCaseWithDate, UpdatedCaseWithDate } from '../routes/api/types';

type CaseGetResponse = GetResponse<NewCaseWithDate>;

type CaseSearchResponse = SearchResponse<NewCaseWithDate>;

export interface CaseServiceInterface {
  getAllCases(): Promise<SearchResponse<CaseSearchResponse>>;
  getCase(id: string): Promise<CaseGetResponse>;
  postCase(newCase: NewCaseWithDate): Promise<CreateDocumentResponse>;
  updateCase(updatedCase: UpdatedCaseWithDate, id: string): Promise<CreateDocumentResponse>;
}

export class CaseService implements CaseServiceInterface {
  constructor(
    private readonly callDataCluster: APICaller,
    private readonly caseIndex: string[] | string,
    private readonly log: Logger
  ) {}

  async getAllCases() {
    this.log.debug(`CaseService - getAllCases`);
    return await this.callDataCluster<CaseSearchResponse>('search', {
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
    return await this.callDataCluster<CaseGetResponse>('get', {
      index: this.caseIndex,
      id,
    });
  }

  async postCase(newCase: NewCaseWithDate) {
    this.log.debug(`CaseService - postCase:`, newCase);
    return await this.callDataCluster<CreateDocumentResponse>('index', {
      index: this.caseIndex,
      body: newCase,
    });
  }

  async updateCase(updatedCase: UpdatedCaseWithDate, id: string) {
    this.log.debug(`CaseService - updateCase/${id}:`, updatedCase);
    return await this.callDataCluster<CreateDocumentResponse>('update', {
      index: this.caseIndex,
      id,
      body: { doc: updatedCase },
    });
  }
}

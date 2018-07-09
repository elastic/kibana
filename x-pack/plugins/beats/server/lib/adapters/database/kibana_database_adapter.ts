/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../famework/adapter_types';
import {
  BulkIndexDocumentsParams,
  CreateDocumentParams,
  CreateDocumentResponse,
  DatabaseAdapter,
  DeleteDocumentParams,
  DeleteDocumentResponse,
  GetDocumentResponse,
  GetParams,
  IndexDocumentParams,
  KbnElasticSearch,
  KbnElasticSearchCluster,
  MGetParams,
  MGetResponse,
  PutTemplateParams,
  SearchParams,
  SearchResponse,
} from './adapter_types';

export class KibanaDatabaseAdapter implements DatabaseAdapter {
  private es: KbnElasticSearchCluster;

  constructor(kbnElasticSearch: KbnElasticSearch) {
    this.es = kbnElasticSearch.getCluster('admin');
  }
  public async putTemplate(
    req: FrameworkRequest | null,
    params: PutTemplateParams
  ): Promise<any> {
    const callES = this.getCallType(req);
    const result = await callES('indices.putTemplate', params);
    return result;
  }

  public async get<Source>(
    req: FrameworkRequest | null,
    params: GetParams
  ): Promise<GetDocumentResponse<Source>> {
    const callES = this.getCallType(req);
    const result = await callES('get', params);
    return result;
    // todo
  }

  public async mget<T>(
    req: FrameworkRequest | null,
    params: MGetParams
  ): Promise<MGetResponse<T>> {
    const callES = this.getCallType(req);
    const result = await callES('mget', params);
    return result;
    // todo
  }

  public async bulk(
    req: FrameworkRequest | null,
    params: BulkIndexDocumentsParams
  ): Promise<any> {
    const callES = this.getCallType(req);
    const result = await callES('bulk', params);
    return result;
  }

  public async create(
    req: FrameworkRequest | null,
    params: CreateDocumentParams
  ): Promise<CreateDocumentResponse> {
    const callES = this.getCallType(req);
    const result = await callES('create', params);
    return result;
  }
  public async index<T>(
    req: FrameworkRequest | null,
    params: IndexDocumentParams<T>
  ): Promise<any> {
    const callES = this.getCallType(req);
    const result = await callES('index', params);
    return result;
  }
  public async delete(
    req: FrameworkRequest | null,
    params: DeleteDocumentParams
  ): Promise<DeleteDocumentResponse> {
    const callES = this.getCallType(req);
    const result = await callES('delete', params);
    return result;
  }

  public async search<Source>(
    req: FrameworkRequest | null,
    params: SearchParams
  ): Promise<SearchResponse<Source>> {
    const callES = this.getCallType(req);
    const result = await callES('search', params);
    return result;
  }

  private getCallType(req: FrameworkRequest | null): any {
    if (req) {
      return this.es.callWithRequest.bind(null, req);
    } else {
      return this.es.callWithInternalUser;
    }
  }
}

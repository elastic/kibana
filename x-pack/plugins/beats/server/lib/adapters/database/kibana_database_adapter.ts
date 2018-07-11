/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework/adapter_types';
import {
  DatabaseAdapter,
  DatabaseBulkIndexDocumentsParams,
  DatabaseCreateDocumentParams,
  DatabaseCreateDocumentResponse,
  DatabaseDeleteDocumentParams,
  DatabaseDeleteDocumentResponse,
  DatabaseGetDocumentResponse,
  DatabaseGetParams,
  DatabaseIndexDocumentParams,
  DatabaseKbnESCluster,
  DatabaseKbnESPlugin,
  DatabaseMGetParams,
  DatabaseMGetResponse,
  DatabasePutTemplateParams,
  DatabaseSearchParams,
  DatabaseSearchResponse,
} from './adapter_types';

const InternalRequest: unique symbol = Symbol('InternalRequest');

type RequestOrInternal = FrameworkRequest | typeof InternalRequest;

export class KibanaDatabaseAdapter implements DatabaseAdapter {
  public readonly InternalRequest = InternalRequest;

  private es: DatabaseKbnESCluster;

  constructor(kbnElasticSearch: DatabaseKbnESPlugin) {
    this.es = kbnElasticSearch.getCluster('admin');
  }
  public async putTemplate(
    req: RequestOrInternal,
    params: DatabasePutTemplateParams
  ): Promise<any> {
    const callES = this.getCallType(req);
    const result = await callES('indices.putTemplate', params);
    return result;
  }

  public async get<Source>(
    req: RequestOrInternal,
    params: DatabaseGetParams
  ): Promise<DatabaseGetDocumentResponse<Source>> {
    const callES = this.getCallType(req);
    const result = await callES('get', params);
    return result;
    // todo
  }

  public async mget<T>(
    req: RequestOrInternal,
    params: DatabaseMGetParams
  ): Promise<DatabaseMGetResponse<T>> {
    const callES = this.getCallType(req);
    const result = await callES('mget', params);
    return result;
    // todo
  }

  public async bulk(
    req: RequestOrInternal,
    params: DatabaseBulkIndexDocumentsParams
  ): Promise<any> {
    const callES = this.getCallType(req);
    const result = await callES('bulk', params);
    return result;
  }

  public async create(
    req: RequestOrInternal,
    params: DatabaseCreateDocumentParams
  ): Promise<DatabaseCreateDocumentResponse> {
    const callES = this.getCallType(req);
    const result = await callES('create', params);
    return result;
  }
  public async index<T>(
    req: RequestOrInternal,
    params: DatabaseIndexDocumentParams<T>
  ): Promise<any> {
    const callES = this.getCallType(req);
    const result = await callES('index', params);
    return result;
  }
  public async delete(
    req: RequestOrInternal,
    params: DatabaseDeleteDocumentParams
  ): Promise<DatabaseDeleteDocumentResponse> {
    const callES = this.getCallType(req);
    const result = await callES('delete', params);
    return result;
  }

  public async search<Source>(
    req: RequestOrInternal,
    params: DatabaseSearchParams
  ): Promise<DatabaseSearchResponse<Source>> {
    const callES = this.getCallType(req);
    const result = await callES('search', params);
    return result;
  }

  private getCallType(req: RequestOrInternal): any {
    if (req !== InternalRequest) {
      return this.es.callWithRequest.bind(null, req);
    } else {
      return this.es.callWithInternalUser;
    }
  }
}

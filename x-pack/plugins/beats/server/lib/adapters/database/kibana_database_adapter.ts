/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { internalAuthData } from '../../../utils/wrap_request';
import { FrameworkUser } from '../framework/adapter_types';
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

export class KibanaDatabaseAdapter implements DatabaseAdapter {
  private es: DatabaseKbnESCluster;

  constructor(kbnElasticSearch: DatabaseKbnESPlugin) {
    this.es = kbnElasticSearch.getCluster('admin');
  }
  public async putTemplate(user: FrameworkUser, params: DatabasePutTemplateParams): Promise<any> {
    const callES = this.getCallType(user);
    const result = await callES('indices.putTemplate', params);
    return result;
  }

  public async get<Source>(
    user: FrameworkUser,
    params: DatabaseGetParams
  ): Promise<DatabaseGetDocumentResponse<Source>> {
    const callES = this.getCallType(user);
    const result = await callES('get', params);
    return result;
    // todo
  }

  public async mget<T>(
    user: FrameworkUser,
    params: DatabaseMGetParams
  ): Promise<DatabaseMGetResponse<T>> {
    const callES = this.getCallType(user);
    const result = await callES('mget', params);
    return result;
    // todo
  }

  public async bulk(user: FrameworkUser, params: DatabaseBulkIndexDocumentsParams): Promise<any> {
    const callES = this.getCallType(user);
    const result = await callES('bulk', params);
    return result;
  }

  public async create(
    user: FrameworkUser,
    params: DatabaseCreateDocumentParams
  ): Promise<DatabaseCreateDocumentResponse> {
    const callES = this.getCallType(user);
    const result = await callES('create', params);
    return result;
  }
  public async index<T>(user: FrameworkUser, params: DatabaseIndexDocumentParams<T>): Promise<any> {
    const callES = this.getCallType(user);
    const result = await callES('index', params);
    return result;
  }
  public async delete(
    user: FrameworkUser,
    params: DatabaseDeleteDocumentParams
  ): Promise<DatabaseDeleteDocumentResponse> {
    const callES = this.getCallType(user);
    const result = await callES('delete', params);
    return result;
  }

  public async search<Source>(
    user: FrameworkUser,
    params: DatabaseSearchParams
  ): Promise<DatabaseSearchResponse<Source>> {
    const callES = this.getCallType(user);
    const result = await callES('search', params);
    return result;
  }

  private getCallType(user: FrameworkUser): any {
    if (user.kind === 'authenticated') {
      return this.es.callWithRequest.bind(null, {
        headers: user[internalAuthData],
      });
    } else if (user.kind === 'internal') {
      return this.es.callWithInternalUser;
    } else {
      throw new Error('Invalid user type');
    }
  }
}

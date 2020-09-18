/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ElasticsearchServiceStart, ILegacyClusterClient } from 'src/core/server';
import { FrameworkUser } from '../framework/adapter_types';
import { internalAuthData } from './../framework/adapter_types';
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
  DatabaseMGetParams,
  DatabaseMGetResponse,
  DatabaseSearchParams,
  DatabaseSearchResponse,
} from './adapter_types';

export class KibanaDatabaseAdapter implements DatabaseAdapter {
  private es: ILegacyClusterClient;

  constructor(elasticsearch: ElasticsearchServiceStart) {
    this.es = elasticsearch.legacy.client;
  }

  public async get<Source>(
    user: FrameworkUser,
    params: DatabaseGetParams
  ): Promise<DatabaseGetDocumentResponse<Source>> {
    return await this.callWithUser(user, 'get', params);
  }

  public async mget<T>(
    user: FrameworkUser,
    params: DatabaseMGetParams
  ): Promise<DatabaseMGetResponse<T>> {
    return await this.callWithUser(user, 'mget', params);
  }

  public async bulk(user: FrameworkUser, params: DatabaseBulkIndexDocumentsParams): Promise<any> {
    return await this.callWithUser(user, 'bulk', params);
  }

  public async create(
    user: FrameworkUser,
    params: DatabaseCreateDocumentParams
  ): Promise<DatabaseCreateDocumentResponse> {
    return await this.callWithUser(user, 'create', params);
  }

  public async index<T>(user: FrameworkUser, params: DatabaseIndexDocumentParams<T>): Promise<any> {
    return await this.callWithUser(user, 'index', params);
  }

  public async delete(
    user: FrameworkUser,
    params: DatabaseDeleteDocumentParams
  ): Promise<DatabaseDeleteDocumentResponse> {
    return await this.callWithUser(user, 'delete', params);
  }

  public async deleteByQuery(
    user: FrameworkUser,
    params: DatabaseSearchParams
  ): Promise<DatabaseDeleteDocumentResponse> {
    return await this.callWithUser(user, 'deleteByQuery', params);
  }

  public async search<Source>(
    user: FrameworkUser,
    params: DatabaseSearchParams
  ): Promise<DatabaseSearchResponse<Source>> {
    return await this.callWithUser(user, 'search', params);
  }

  public async searchAll<Source>(
    user: FrameworkUser,
    params: DatabaseSearchParams
  ): Promise<DatabaseSearchResponse<Source>> {
    return await this.callWithUser(user, 'search', {
      scroll: '1m',
      ...params,
      body: {
        size: 1000,
        ...params.body,
      },
    });
  }

  public async putTemplate(name: string, template: any): Promise<any> {
    return await this.callWithUser({ kind: 'internal' }, 'indices.putTemplate', {
      name,
      body: template,
    });
  }

  private callWithUser(user: FrameworkUser, esMethod: string, options: any = {}): any {
    if (user.kind === 'authenticated') {
      return this.es
        .asScoped({
          headers: user[internalAuthData],
        })
        .callAsCurrentUser(esMethod, options);
    } else if (user.kind === 'internal') {
      return this.es.callAsInternalUser(esMethod, options);
    } else {
      throw new Error('Invalid user type');
    }
  }
}

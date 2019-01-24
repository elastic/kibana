/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { INDEX_NAMES } from '../../../../common/constants/index_names';
import { beatsIndexTemplate } from '../../../utils/index_templates';
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
  DatabaseKbnESCluster,
  DatabaseKbnESPlugin,
  DatabaseMGetParams,
  DatabaseMGetResponse,
  DatabaseSearchParams,
  DatabaseSearchResponse,
} from './adapter_types';

export class KibanaDatabaseAdapter implements DatabaseAdapter {
  private es: DatabaseKbnESCluster;

  constructor(kbnElasticSearch: DatabaseKbnESPlugin) {
    this.es = kbnElasticSearch.getCluster('admin');
  }

  public async get<Source>(
    user: FrameworkUser,
    params: DatabaseGetParams
  ): Promise<DatabaseGetDocumentResponse<Source>> {
    const result = await this.callWithUser(user, 'get', params);
    return result;
    // todo
  }

  public async mget<T>(
    user: FrameworkUser,
    params: DatabaseMGetParams
  ): Promise<DatabaseMGetResponse<T>> {
    const result = await this.callWithUser(user, 'mget', params);
    return result;
    // todo
  }

  public async bulk(user: FrameworkUser, params: DatabaseBulkIndexDocumentsParams): Promise<any> {
    await this.putTemplate();

    const result = await this.callWithUser(user, 'bulk', params);
    return result;
  }

  public async create(
    user: FrameworkUser,
    params: DatabaseCreateDocumentParams
  ): Promise<DatabaseCreateDocumentResponse> {
    await this.putTemplate();
    const result = await this.callWithUser(user, 'create', params);
    return result;
  }
  public async index<T>(user: FrameworkUser, params: DatabaseIndexDocumentParams<T>): Promise<any> {
    await this.putTemplate();
    const result = await this.callWithUser(user, 'index', params);
    return result;
  }
  public async delete(
    user: FrameworkUser,
    params: DatabaseDeleteDocumentParams
  ): Promise<DatabaseDeleteDocumentResponse> {
    const result = await this.callWithUser(user, 'delete', params);
    return result;
  }

  public async search<Source>(
    user: FrameworkUser,
    params: DatabaseSearchParams
  ): Promise<DatabaseSearchResponse<Source>> {
    const result = await this.callWithUser(user, 'search', params);
    return result;
  }

  // TODO move beats template name and body out of this bridge
  private async putTemplate(): Promise<any> {
    const result = await this.callWithUser({ kind: 'internal' }, 'indices.putTemplate', {
      name: INDEX_NAMES.BEATS,
      body: beatsIndexTemplate,
    });

    return result;
  }

  private callWithUser(user: FrameworkUser, esMethod: string, options: any = {}): any {
    if (user.kind === 'authenticated') {
      return this.es.callWithRequest(
        {
          headers: user[internalAuthData],
        } as any,
        esMethod,
        options
      );
    } else if (user.kind === 'internal') {
      return this.es.callWithInternalUser(esMethod, options);
    } else {
      throw new Error('Invalid user type');
    }
  }
}

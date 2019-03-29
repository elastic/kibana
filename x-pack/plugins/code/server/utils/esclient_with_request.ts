/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { AnyObject, EsClient } from '../lib/esqueue';
import { EsIndexClient } from './es_index_client';
import { WithRequest } from './with_request';

export class EsClientWithRequest extends WithRequest implements EsClient {
  public readonly indices = new EsIndexClient(this);

  constructor(readonly req: Request) {
    super(req);
  }

  public bulk(params: AnyObject): Promise<any> {
    return this.callWithRequest('bulk', params);
  }

  public delete(params: AnyObject): Promise<any> {
    return this.callWithRequest('delete', params);
  }

  public deleteByQuery(params: AnyObject): Promise<any> {
    return this.callWithRequest('deleteByQuery', params);
  }

  public get(params: AnyObject): Promise<any> {
    return this.callWithRequest('get', params);
  }

  public index(params: AnyObject): Promise<any> {
    return this.callWithRequest('index', params);
  }

  public ping(): Promise<void> {
    return this.callWithRequest('ping');
  }

  public reindex(params: AnyObject): Promise<any> {
    return this.callWithRequest('reindex', params);
  }

  public search(params: AnyObject): Promise<any> {
    return this.callWithRequest('search', params);
  }

  public update(params: AnyObject): Promise<any> {
    return this.callWithRequest('update', params);
  }
}

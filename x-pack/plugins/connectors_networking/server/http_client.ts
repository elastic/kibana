/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { RequestHandlerContext, Logger } from '../../../../src/core/server';
import { getUrlInfo } from './lib/url_info';
import { ConnectorsNetworkingHttpClient, ConnectorOptions, ConnectorOptionsWithId } from './types';

export function createConnectorsNetworkingHttpClient(
  ctx: RequestHandlerContext,
  logger: Logger
): ConnectorsNetworkingHttpClient {
  return new ConnectorsNetworkingClientImpl(ctx, logger);
}

// eventually will be a saved object store; hack a global for now
const coMap: Map<string, ConnectorOptions> = new Map();

class ConnectorsNetworkingClientImpl implements ConnectorsNetworkingHttpClient {
  constructor(private ctx: RequestHandlerContext, private logger: Logger) {}

  async create(co: ConnectorOptions): Promise<ConnectorOptionsWithId> {
    const urlInfo = getUrlInfo(co.url);
    const id = urlInfo.id;
    if (this.ctx.core.savedObjects == null) {
      // eventually we'll use the savedObjects from the context ...
    }

    // urlInfo "normalizes" the url (adds the port if not there)
    co.url = urlInfo.url;

    if (coMap.has(id)) {
      throw new Error(`connector options for id "${id}" already exists`);
    }

    coMap.set(id, co);
    this.logger.debug(`client: create: "${id}"`);
    return getConnectorOptionsWithId(id, co);
  }

  async find(): Promise<ConnectorOptionsWithId[]> {
    this.logger.debug(`client: find`);

    const result: ConnectorOptionsWithId[] = [];
    for (const [id, co] of coMap) {
      result.push(getConnectorOptionsWithId(id, co));
    }
    return result;
  }

  async findForUrl(url: string): Promise<ConnectorOptionsWithId | undefined> {
    this.logger.debug(`client: findForUrl: "${url}"`);

    const urlInfo = getUrlInfo(url);
    for (const [id, co] of coMap) {
      if (id === urlInfo.id) return getConnectorOptionsWithId(id, co);
    }

    return;
  }

  async get(id: string): Promise<ConnectorOptionsWithId> {
    this.logger.debug(`client: get: "${id}"`);

    const co = coMap.get(id);
    if (!co) {
      throw new Error(`options not found with id "${id}"`);
    }

    return getConnectorOptionsWithId(id, co);
  }

  async update(id: string, co: ConnectorOptions): Promise<ConnectorOptionsWithId> {
    this.logger.debug(`client: update: "${id}"`);
    const coFound = coMap.get(id);
    if (!coFound) {
      throw new Error(`connector options for id "${id}" not found`);
    }

    // url can't be updated
    if (co.url !== coFound.url) {
      throw new Error(`connector options url cannot be changed via update`);
    }

    coMap.set(id, co);
    return getConnectorOptionsWithId(id, co);
  }

  async delete(id: string): Promise<void> {
    this.logger.debug(`client: delete: "${id}"`);
    if (!coMap.has(id)) {
      throw new Error(`connector options for id "${id}" not found`);
    }

    coMap.delete(id);
  }
}

function getConnectorOptionsWithId(id: string, co: ConnectorOptions): ConnectorOptionsWithId {
  return { ...cloneDeep(co), id };
}

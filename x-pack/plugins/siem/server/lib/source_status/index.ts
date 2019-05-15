/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
import { AliasConfiguration, SourceConfiguration, Sources } from '../sources';
export { ElasticsearchSourceStatusAdapter } from './elasticsearch_adapter';

export class SourceStatus {
  constructor(private readonly adapter: SourceStatusAdapter, private readonly sources: Sources) {}

  public async getIndexNames(
    request: FrameworkRequest,
    sourceId: string,
    aliasName: keyof AliasConfiguration
  ): Promise<string[]> {
    return await this.adapter.getIndexNames(request, await this.getAliasName(sourceId, aliasName));
  }
  public async hasAlias(
    request: FrameworkRequest,
    sourceId: string,
    aliasName: keyof AliasConfiguration
  ): Promise<boolean> {
    return await this.adapter.hasAlias(request, await this.getAliasName(sourceId, aliasName));
  }
  public async hasIndices(
    request: FrameworkRequest,
    sourceId: string,
    aliasName: keyof AliasConfiguration
  ): Promise<boolean> {
    return await this.adapter.hasIndices(request, await this.getAliasName(sourceId, aliasName));
  }

  private getAliasName = async (sourceId: string, aliasName: keyof AliasConfiguration) => {
    const sourceConfiguration: SourceConfiguration = await this.sources.getConfiguration(sourceId);
    return prop(sourceConfiguration, aliasName);
  };
}

export interface SourceStatusAdapter {
  getIndexNames(request: FrameworkRequest, aliasName: string): Promise<string[]>;
  hasAlias(request: FrameworkRequest, aliasName: string): Promise<boolean>;
  hasIndices(request: FrameworkRequest, indexNames: string): Promise<boolean>;
}

function prop<T, K extends keyof SourceConfiguration>(obj: SourceConfiguration, key: K) {
  return obj[key];
}

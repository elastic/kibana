/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraSources } from './sources';

export class InfraSourceStatus {
  constructor(
    private readonly adapter: InfraSourceStatusAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getLogIndexNames(
    requestContext: RequestHandlerContext,
    sourceId: string
  ): Promise<string[]> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const indexNames = await this.adapter.getIndexNames(
      requestContext,
      sourceConfiguration.configuration.logAlias
    );
    return indexNames;
  }
  public async getMetricIndexNames(
    requestContext: RequestHandlerContext,
    sourceId: string
  ): Promise<string[]> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const indexNames = await this.adapter.getIndexNames(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return indexNames;
  }
  public async hasLogAlias(
    requestContext: RequestHandlerContext,
    sourceId: string
  ): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const hasAlias = await this.adapter.hasAlias(
      requestContext,
      sourceConfiguration.configuration.logAlias
    );
    return hasAlias;
  }
  public async hasMetricAlias(
    requestContext: RequestHandlerContext,
    sourceId: string
  ): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const hasAlias = await this.adapter.hasAlias(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return hasAlias;
  }
  public async getLogIndexStatus(
    requestContext: RequestHandlerContext,
    sourceId: string
  ): Promise<SourceIndexStatus> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const indexStatus = await this.adapter.getIndexStatus(
      requestContext,
      sourceConfiguration.configuration.logAlias
    );
    return indexStatus;
  }
  public async hasMetricIndices(
    requestContext: RequestHandlerContext,
    sourceId: string
  ): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const indexStatus = await this.adapter.getIndexStatus(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return indexStatus !== 'missing';
  }
}

export type SourceIndexStatus = 'missing' | 'empty' | 'available';

export interface InfraSourceStatusAdapter {
  getIndexNames(requestContext: RequestHandlerContext, aliasName: string): Promise<string[]>;
  hasAlias(requestContext: RequestHandlerContext, aliasName: string): Promise<boolean>;
  getIndexStatus(
    requestContext: RequestHandlerContext,
    indexNames: string
  ): Promise<SourceIndexStatus>;
}

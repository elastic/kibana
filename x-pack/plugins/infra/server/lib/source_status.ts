/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraPluginRequestHandlerContext } from '../types';
import { InfraSources } from './sources';

export class InfraSourceStatus {
  constructor(
    private readonly adapter: InfraSourceStatusAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getMetricIndexNames(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<string[]> {
    const soClient = (await requestContext.core).savedObjects.client;
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(soClient, sourceId);
    const indexNames = await this.adapter.getIndexNames(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return indexNames;
  }

  public async hasMetricAlias(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<boolean> {
    const soClient = (await requestContext.core).savedObjects.client;
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(soClient, sourceId);
    const hasAlias = await this.adapter.hasAlias(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return hasAlias;
  }

  public async hasMetricIndices(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string
  ): Promise<boolean> {
    const soClient = (await requestContext.core).savedObjects.client;
    const sourceConfiguration = await this.libs.sources.getSourceConfiguration(soClient, sourceId);
    const indexStatus = await this.adapter.getIndexStatus(
      requestContext,
      sourceConfiguration.configuration.metricAlias
    );
    return indexStatus !== 'missing';
  }
}

export type SourceIndexStatus = 'missing' | 'empty' | 'available';

export interface InfraSourceStatusAdapter {
  getIndexNames(
    requestContext: InfraPluginRequestHandlerContext,
    aliasName: string
  ): Promise<string[]>;

  hasAlias(requestContext: InfraPluginRequestHandlerContext, aliasName: string): Promise<boolean>;

  getIndexStatus(
    requestContext: InfraPluginRequestHandlerContext,
    indexNames: string
  ): Promise<SourceIndexStatus>;
}

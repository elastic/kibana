/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraFrameworkRequest } from './adapters/framework';
import { InfraSources } from './sources';

export class InfraSourceStatus {
  constructor(
    private readonly adapter: InfraSourceStatusAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getLogIndexNames(
    request: InfraFrameworkRequest,
    sourceId: string
  ): Promise<string[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const indexNames = await this.adapter.getIndexNames(request, sourceConfiguration.logAlias);
    return indexNames;
  }
  public async getMetricIndexNames(
    request: InfraFrameworkRequest,
    sourceId: string
  ): Promise<string[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const indexNames = await this.adapter.getIndexNames(request, sourceConfiguration.metricAlias);
    return indexNames;
  }
  public async hasLogAlias(request: InfraFrameworkRequest, sourceId: string): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const hasAlias = await this.adapter.hasAlias(request, sourceConfiguration.logAlias);
    return hasAlias;
  }
  public async hasMetricAlias(request: InfraFrameworkRequest, sourceId: string): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const hasAlias = await this.adapter.hasAlias(request, sourceConfiguration.metricAlias);
    return hasAlias;
  }
  public async hasLogIndices(request: InfraFrameworkRequest, sourceId: string): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const hasIndices = await this.adapter.hasIndices(request, sourceConfiguration.logAlias);
    return hasIndices;
  }
  public async hasMetricIndices(
    request: InfraFrameworkRequest,
    sourceId: string
  ): Promise<boolean> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const hasIndices = await this.adapter.hasIndices(request, sourceConfiguration.metricAlias);
    return hasIndices;
  }
}

export interface InfraSourceStatusAdapter {
  getIndexNames(request: InfraFrameworkRequest, aliasName: string): Promise<string[]>;
  hasAlias(request: InfraFrameworkRequest, aliasName: string): Promise<boolean>;
  hasIndices(request: InfraFrameworkRequest, indexNames: string): Promise<boolean>;
}

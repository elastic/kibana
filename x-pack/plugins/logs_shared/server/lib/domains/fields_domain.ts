/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsSharedPluginRequestHandlerContext } from '../../types';
import { FieldsAdapter } from '../adapters/fields';
import { LogsSharedSourceIndexField, LogsSharedSources } from '../sources';

export class LogsSharedFieldsDomain {
  constructor(
    private readonly adapter: FieldsAdapter,
    private readonly libs: { sources: LogsSharedSources }
  ) {}

  public async getFields(
    requestContext: LogsSharedPluginRequestHandlerContext,
    sourceId: string,
    indexType: 'METRICS'
  ): Promise<LogsSharedSourceIndexField[]> {
    const soClient = (await requestContext.core).savedObjects.client;
    const { configuration } = await this.libs.sources.getSourceConfiguration(soClient, sourceId);

    const fields = await this.adapter.getIndexFields(requestContext, configuration.metricAlias);

    return fields;
  }
}

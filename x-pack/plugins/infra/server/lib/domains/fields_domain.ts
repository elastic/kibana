/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraPluginRequestHandlerContext } from '../../types';
import { FieldsAdapter } from '../adapters/fields';
import { InfraSourceIndexField, InfraSources } from '../sources';

export class InfraFieldsDomain {
  constructor(
    private readonly adapter: FieldsAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getFields(
    requestContext: InfraPluginRequestHandlerContext,
    sourceId: string,
    indexType: 'METRICS'
  ): Promise<InfraSourceIndexField[]> {
    const soClient = (await requestContext.core).savedObjects.client;
    const { configuration } = await this.libs.sources.getSourceConfiguration(soClient, sourceId);

    const fields = await this.adapter.getIndexFields(requestContext, configuration.metricAlias);

    return fields;
  }
}

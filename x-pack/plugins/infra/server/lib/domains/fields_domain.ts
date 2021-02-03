/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    indexType: 'LOGS' | 'METRICS' | 'ANY'
  ): Promise<InfraSourceIndexField[]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(
      requestContext.core.savedObjects.client,
      sourceId
    );
    const includeMetricIndices = ['ANY', 'METRICS'].includes(indexType);
    const includeLogIndices = ['ANY', 'LOGS'].includes(indexType);

    const fields = await this.adapter.getIndexFields(
      requestContext,
      [
        ...(includeMetricIndices ? [configuration.metricAlias] : []),
        ...(includeLogIndices ? [configuration.logAlias] : []),
      ].join(',')
    );

    return fields;
  }
}

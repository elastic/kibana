/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraIndexField, InfraIndexType } from '../../graphql/types';
import { FieldsAdapter } from '../adapters/fields';
import { InfraSources } from '../sources';

export class InfraFieldsDomain {
  constructor(
    private readonly adapter: FieldsAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getFields(
    requestContext: RequestHandlerContext,
    sourceId: string,
    indexType: InfraIndexType
  ): Promise<InfraIndexField[]> {
    const { configuration } = await this.libs.sources.getSourceConfiguration(
      requestContext,
      sourceId
    );
    const includeMetricIndices = [InfraIndexType.ANY, InfraIndexType.METRICS].includes(indexType);
    const includeLogIndices = [InfraIndexType.ANY, InfraIndexType.LOGS].includes(indexType);

    const fields = await this.adapter.getIndexFields(
      requestContext,
      `${includeMetricIndices ? configuration.metricAlias : ''},${
        includeLogIndices ? configuration.logAlias : ''
      }`
    );

    return fields;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraIndexField, InfraIndexType } from '../../../common/graphql/types';
import { FieldsAdapter } from '../adapters/fields';
import { InfraFrameworkRequest } from '../adapters/framework';
import { InfraSources } from '../sources';

export class InfraFieldsDomain {
  constructor(
    private readonly adapter: FieldsAdapter,
    private readonly libs: { sources: InfraSources }
  ) {}

  public async getFields(
    request: InfraFrameworkRequest,
    sourceId: string,
    indexType: InfraIndexType
  ): Promise<InfraIndexField[]> {
    const sourceConfiguration = await this.libs.sources.getConfiguration(sourceId);
    const includeMetricIndices = [InfraIndexType.ANY, InfraIndexType.METRICS].includes(indexType);
    const includeLogIndices = [InfraIndexType.ANY, InfraIndexType.LOGS].includes(indexType);

    const fields = await this.adapter.getIndexFields(request, [
      ...(includeMetricIndices ? [sourceConfiguration.metricAlias] : []),
      ...(includeLogIndices ? [sourceConfiguration.logAlias] : []),
    ]);

    return fields;
  }
}

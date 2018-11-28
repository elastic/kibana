/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexField, IndexType } from '../../../common/graphql/types';
import { FrameworkRequest } from '../framework';
import { Sources } from '../sources';
import { FieldsAdapter } from './types';
export { ElasticsearchIndexFieldAdapter } from './elasticsearch_adapter';

export class IndexFields implements FieldsAdapter {
  private adapter: FieldsAdapter;
  private sources: Sources;

  constructor(adapter: FieldsAdapter, sources: Sources) {
    this.adapter = adapter;
    this.sources = sources;
  }

  public async getFields(
    request: FrameworkRequest,
    sourceId: string,
    indexType: IndexType
  ): Promise<IndexField[]> {
    const sourceConfiguration = await this.sources.getConfiguration(sourceId);
    const includeAuditBeatIndices = [IndexType.ANY, IndexType.AUDITBEAT].includes(indexType);
    const includeLogIndices = [IndexType.ANY, IndexType.LOGS].includes(indexType);

    const indices = [
      ...(includeAuditBeatIndices ? [sourceConfiguration.auditbeatAlias] : []),
      ...(includeLogIndices ? [sourceConfiguration.logAlias] : []),
    ];

    return this.getIndexFields(request, indices);
  }

  public async getIndexFields(
    request: FrameworkRequest,
    indices: string[] = []
  ): Promise<IndexField[]> {
    return await this.adapter.getIndexFields(request, indices as string[]);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexField, IndexType } from '../../graphql/types';
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
    indexTypes: IndexType[]
  ): Promise<IndexField[]> {
    const sourceConfiguration = await this.sources.getConfiguration(sourceId);
    const includeAuditBeatIndices =
      indexTypes.includes(IndexType.ANY) || indexTypes.includes(IndexType.AUDITBEAT);
    const includeFileBeatIndices =
      indexTypes.includes(IndexType.ANY) || indexTypes.includes(IndexType.FILEBEAT);
    const includePacketBeatIndices =
      indexTypes.includes(IndexType.ANY) || indexTypes.includes(IndexType.PACKETBEAT);

    const indices = [
      ...(includeAuditBeatIndices ? [sourceConfiguration.auditbeatAlias] : []),
      ...(includeFileBeatIndices ? [sourceConfiguration.logAlias] : []),
      ...(includePacketBeatIndices ? [sourceConfiguration.packetbeatAlias] : []),
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

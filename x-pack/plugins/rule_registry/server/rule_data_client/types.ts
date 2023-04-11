/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { BulkRequest, BulkResponse } from '@elastic/elasticsearch/api/types';

import { ESSearchRequest, ESSearchResponse } from 'src/core/types/elasticsearch';
import { FieldDescriptor } from 'src/plugins/data/server';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';

export interface IRuleDataClient {
  indexName: string;
  kibanaVersion: string;
  isWriteEnabled(): boolean;
  getReader(options?: { namespace?: string }): IRuleDataReader;
  getWriter(options?: { namespace?: string }): IRuleDataWriter;
}

export interface IRuleDataReader {
  search<TSearchRequest extends ESSearchRequest>(
    request: TSearchRequest
  ): Promise<ESSearchResponse<Partial<ParsedTechnicalFields>, TSearchRequest>>;

  getDynamicIndexPattern(target?: string): Promise<{
    title: string;
    timeFieldName: string;
    fields: FieldDescriptor[];
  }>;
}

export interface IRuleDataWriter {
  bulk(request: BulkRequest): Promise<ApiResponse<BulkResponse> | undefined>;
}

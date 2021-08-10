/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { BulkRequest, BulkResponse } from '@elastic/elasticsearch/api/types';

import { FieldDescriptor } from 'src/plugins/data/server';
import { ESSearchRequest, ESSearchResponse } from 'src/core/types/elasticsearch';
import { TechnicalRuleDataFieldName } from '../../common/technical_rule_data_field_names';

export interface RuleDataReader {
  search<TSearchRequest extends ESSearchRequest>(
    request: TSearchRequest
  ): Promise<
    ESSearchResponse<Partial<Record<TechnicalRuleDataFieldName, unknown[]>>, TSearchRequest>
  >;
  getDynamicIndexPattern(
    target?: string
  ): Promise<{
    title: string;
    timeFieldName: string;
    fields: FieldDescriptor[];
  }>;
}

export interface RuleDataWriter {
  bulk(request: BulkRequest): Promise<ApiResponse<BulkResponse>>;
}

export interface IRuleDataClient {
  indexName: string;
  getReader(options?: { namespace?: string }): RuleDataReader;
  getWriter(options?: { namespace?: string }): RuleDataWriter;
  isWriteEnabled(): boolean;
}

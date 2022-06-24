/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportResult } from '@elastic/elasticsearch';
import { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { ESSearchRequest, ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { FieldDescriptor } from '@kbn/data-plugin/server';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';

export interface IRuleDataClient {
  indexName: string;
  indexNameWithNamespace(namespace: string): string;
  kibanaVersion: string;
  isWriteEnabled(): boolean;
  getReader(options?: { namespace?: string }): IRuleDataReader;
  getWriter(options?: { namespace?: string }): IRuleDataWriter;
}

export interface IRuleDataReader {
  search<TSearchRequest extends ESSearchRequest>(
    request: TSearchRequest
  ): Promise<
    ESSearchResponse<Partial<ParsedTechnicalFields & ParsedExperimentalFields>, TSearchRequest>
  >;

  getDynamicIndexPattern(target?: string): Promise<{
    title: string;
    timeFieldName: string;
    fields: FieldDescriptor[];
  }>;
}

export interface IRuleDataWriter {
  bulk(request: BulkRequest): Promise<TransportResult<BulkResponse, unknown> | undefined>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { BulkRequest, BulkResponse } from '@elastic/elasticsearch/api/types';
import { ElasticsearchClient } from 'kibana/server';
import { FieldDescriptor } from 'src/plugins/data/server';
import { ESSearchRequest, ESSearchResponse } from 'src/core/types/elasticsearch';
import { TechnicalRuleDataFieldName } from '../../common/technical_rule_data_field_names';
import { ValidFeatureId } from '../utils/rbac';

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
  bulk<TSource = unknown, TContext = unknown>(
    request: BulkRequest<TSource>
  ): Promise<ApiResponse<BulkResponse, TContext>>;
}

export interface IRuleDataClient {
  getReader(options?: { namespace?: string }): RuleDataReader;
  getWriter(options?: { namespace?: string }): RuleDataWriter;
  createWriteTargetIfNeeded(options: { namespace?: string }): Promise<void>;
}

/**
 * The purpose of the `feature` param is to force the user to update
 * the data structure which contains the mapping of consumers to alerts
 * as data indices. The idea is it is typed such that it forces the
 * user to go to the code and modify it. At least until a better system
 * is put in place or we move the alerts as data client out of rule registry.
 */
export interface RuleDataClientConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  isWriteEnabled: boolean;
  ready: () => Promise<void>;
  alias: string;
  feature: ValidFeatureId;
}

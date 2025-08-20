/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { LogsOsqueryAction } from '@kbn/osquery-plugin/common/types/osquery_action';
import type { LogsEndpointActionWithHosts } from '../../../endpoint/types';
import type { ResponseActionsQueries } from '.';

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export interface RequestBasicOptions extends IEsSearchRequest {
  factoryQueryType: ResponseActionsQueries;
}

export type ResponseActionsSearchHit = estypes.SearchHit<
  LogsOsqueryAction | LogsEndpointActionWithHosts
>;

export interface Inspect {
  dsl: string[];
}

export type Maybe<T> = T | null;

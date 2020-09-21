/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';
import { TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';
import { IEsSearchRequest, IEsSearchResponse } from '../../../../../../src/plugins/data/server';

export type EqlSearchStrategyRequest = IEsSearchRequest<
  unknown,
  EqlSearch<Record<string, unknown>>
> & {
  options?: TransportRequestOptions;
};

export type EqlSearchStrategyResponse = IEsSearchResponse<unknown>;

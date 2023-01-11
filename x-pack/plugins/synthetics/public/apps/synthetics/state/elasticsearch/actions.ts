/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esTypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESSearchResponse } from '@kbn/es-types';
import { FetcherResult } from '@kbn/observability-plugin/public/hooks/use_fetcher';
import { createAsyncAction } from '../utils/actions';

export const executeEsQueryAction = createAsyncAction<
  {
    params: esTypes.SearchRequest;
    name: string;
    addInspectorRequest: <Data>(result: FetcherResult<Data>) => void;
  },
  { name: string; result: ESSearchResponse }
>('executeEsQueryAction');

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceQuery } from '../../../../../common/graphql/types';
import {
  createGraphqlOperationActionCreators,
  createGraphqlOperationReducer,
  createGraphqlQueryEpic,
} from '../../../../utils/remote_state/remote_graphql_state';
import { initialSourceState } from '../state';
import { sourceQuery } from './query_source.gql_query';

const operationKey = 'load';

export const loadSourceActionCreators = createGraphqlOperationActionCreators<
  SourceQuery.Query,
  SourceQuery.Variables
>('source', operationKey);

export const loadSourceReducer = createGraphqlOperationReducer(
  operationKey,
  initialSourceState,
  loadSourceActionCreators,
  (state, action) => action.payload.result.data.source
);

export const loadSourceEpic = createGraphqlQueryEpic(sourceQuery, loadSourceActionCreators);

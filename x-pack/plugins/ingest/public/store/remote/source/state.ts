/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceQuery } from '../../../../common/graphql/types';
import {
  createGraphqlInitialState,
  GraphqlState,
} from '../../../utils/remote_state/remote_graphql_state';

export type SourceRemoteState = SourceQuery.Source;
export type SourceState = GraphqlState<SourceRemoteState>;

export const initialSourceState = createGraphqlInitialState<SourceRemoteState>();

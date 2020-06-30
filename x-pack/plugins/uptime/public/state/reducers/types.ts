/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IHttpFetchError } from 'src/core/public';

export interface AsyncInitialState<ReduceStateType> {
  data: ReduceStateType | null;
  loading: boolean;
  error?: IHttpFetchError | null;
}

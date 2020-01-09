/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessEvent } from '../../types';

interface ServerReturnedResolverData {
  readonly type: 'serverReturnedResolverData';
  readonly payload: {
    readonly data: {
      readonly result: {
        readonly search_results: readonly ProcessEvent[];
      };
    };
  };
}

export type DataAction = ServerReturnedResolverData;

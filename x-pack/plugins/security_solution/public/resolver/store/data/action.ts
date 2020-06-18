/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverEvent, ResolverNodeStats } from '../../../../common/endpoint/types';

interface ServerReturnedResolverData {
  readonly type: 'serverReturnedResolverData';
  readonly events: ResolverEvent[];
  readonly stats: Map<string, ResolverNodeStats>;
}

interface ServerFailedToReturnResolverData {
  readonly type: 'serverFailedToReturnResolverData';
}

/**
 * Will occur when a request for related event data is unsuccessful.
 */
interface ServerFailedToReturnRelatedEventData {
  readonly type: 'serverFailedToReturnRelatedEventData';
  readonly payload: ResolverEvent;
}

export type DataAction =
  | ServerReturnedResolverData
  | ServerFailedToReturnResolverData
  | ServerFailedToReturnRelatedEventData;

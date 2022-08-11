/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { IEsSearchResponse, ISearchRequestParams } from '@kbn/data-plugin/common';
import type {
  FactoryQueryTypes,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import type { EndpointAppContext } from '../../../endpoint/types';

export interface SecuritySolutionFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: StrategyRequestType<T>,
    response: IEsSearchResponse,
    deps?: {
      esClient: IScopedClusterClient;
      savedObjectsClient: SavedObjectsClientContract;
      endpointContext: EndpointAppContext;
      request: KibanaRequest;
      spaceId?: string;
    }
  ) => Promise<StrategyResponseType<T>>;
}

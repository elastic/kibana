/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IScopedClusterClient,
  SavedObjectsClientContract,
} from '../../../../../../../src/core/server';
import {
  IEsSearchResponse,
  ISearchRequestParams,
} from '../../../../../../../src/plugins/data/common';
import {
  FactoryQueryTypes,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import { EndpointAppContext } from '../../../endpoint/types';

export interface SecuritySolutionFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: StrategyRequestType<T>,
    response: IEsSearchResponse,
    deps?: {
      esClient: IScopedClusterClient;
      savedObjectsClient: SavedObjectsClientContract;
      endpointContext: EndpointAppContext;
    }
  ) => Promise<StrategyResponseType<T>>;
}

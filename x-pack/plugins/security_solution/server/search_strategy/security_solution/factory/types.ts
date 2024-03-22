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
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type {
  FactoryQueryTypes,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import type { EndpointAppContext } from '../../../endpoint/types';

export interface SecuritySolutionBasicFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: StrategyRequestType<T>,
    response: IEsSearchResponse,
    deps: {
      esClient: IScopedClusterClient;
      savedObjectsClient: SavedObjectsClientContract;
      endpointContext: EndpointAppContext;
      request: KibanaRequest;
      dsl: ISearchRequestParams;
      spaceId?: string;
      ruleDataClient?: IRuleDataClient | null;
    }
  ) => Promise<StrategyResponseType<T>>;
}

export interface SecuritySolutionWithCountFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  buildCountDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parseResponses: (
    options: StrategyRequestType<T>,
    responses: [IEsSearchResponse, IEsSearchResponse],
    deps: {
      esClient: IScopedClusterClient;
      savedObjectsClient: SavedObjectsClientContract;
      endpointContext: EndpointAppContext;
      request: KibanaRequest;
      dsls: [ISearchRequestParams, ISearchRequestParams];
      spaceId?: string;
      ruleDataClient?: IRuleDataClient | null;
    }
  ) => Promise<StrategyResponseType<T>>;
}

export type SecuritySolutionFactory<T extends FactoryQueryTypes> =
  | SecuritySolutionBasicFactory<T>
  | SecuritySolutionWithCountFactory<T>;

export const isSecuritySolutionWithCountFactory = <T extends FactoryQueryTypes>(
  factory: SecuritySolutionFactory<T>
): factory is SecuritySolutionWithCountFactory<T> => {
  return (
    (factory as SecuritySolutionWithCountFactory<T>).buildCountDsl != null &&
    (factory as SecuritySolutionWithCountFactory<T>).parseResponses != null
  );
};

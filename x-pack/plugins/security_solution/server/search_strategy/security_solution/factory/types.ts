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

export interface ParseDeps {
  esClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  endpointContext: EndpointAppContext;
  request: KibanaRequest;
  dsl: ISearchRequestParams;
  spaceId?: string;
  ruleDataClient?: IRuleDataClient | null;
}

export interface SecuritySolutionFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: StrategyRequestType<T>,
    response: IEsSearchResponse,
    deps?: ParseDeps
  ) => Promise<StrategyResponseType<T>>;
}

export interface ParseWithCountDeps extends Omit<ParseDeps, 'dsl'> {
  dsls: [ISearchRequestParams, ISearchRequestParams];
}
export interface SecuritySolutionWithCountFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  buildCountDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: StrategyRequestType<T>,
    responses: [IEsSearchResponse, IEsSearchResponse],
    deps: ParseWithCountDeps
  ) => Promise<StrategyResponseType<T>>;
}

export type SecuritySolutionSearchStrategyFactory<T extends FactoryQueryTypes> =
  | SecuritySolutionFactory<T>
  | SecuritySolutionWithCountFactory<T>;

export const isSecuritySolutionWithCountFactory = <T extends FactoryQueryTypes>(
  factory: SecuritySolutionSearchStrategyFactory<T>
): factory is SecuritySolutionWithCountFactory<T> => {
  return (
    (factory as SecuritySolutionWithCountFactory<T>).buildCountDsl != null
    // &&    (factory as SecuritySolutionWithCountFactory<T>).parseResponses != null
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import { FactoryQueryTypes } from '../../../../common/search_strategy/security_solution';
import {
  HostDetailsStrategyResponse,
  HostsStrategyResponse,
  HostsRequestOptions,
  HostOverviewRequestOptions,
} from '../../../../common/search_strategy/security_solution/hosts';

export interface SecuritySolutionFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => unknown;
  parse: (
    options: StrategyRequestType<T>,
    response: IEsSearchResponse
  ) => Promise<StrategyResponseType<T>>;
}

export type StrategyResponseType<T extends FactoryQueryTypes> = T extends 'host_all'
  ? HostsStrategyResponse
  : T extends 'host_details'
  ? HostDetailsStrategyResponse
  : never;

export type StrategyRequestType<T extends FactoryQueryTypes> = T extends 'host_all'
  ? HostsRequestOptions
  : T extends 'host_details'
  ? HostOverviewRequestOptions
  : never;

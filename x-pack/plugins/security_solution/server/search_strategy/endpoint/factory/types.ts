/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import type {
  EndpointFactoryQueryTypes,
  EndpointStrategyParseResponseType,
  EndpointStrategyRequestType,
  EndpointStrategyResponseType,
} from '../../../../common/search_strategy/endpoint';
import type { EndpointAuthz } from '../../../../common/endpoint/types/authz';
import type { EndpointAppContext } from '../../../endpoint/types';

export interface EndpointFactory<T extends EndpointFactoryQueryTypes> {
  buildDsl: (
    options: EndpointStrategyRequestType<T>,
    deps: {
      authz: EndpointAuthz | void;
    }
  ) => ISearchRequestParams;
  parse: (
    options: EndpointStrategyRequestType<T>,
    response: EndpointStrategyParseResponseType<T>,
    deps: {
      endpointContext: EndpointAppContext;
      request: KibanaRequest;
      authz: EndpointAuthz | void;
    }
  ) => Promise<EndpointStrategyResponseType<T>>;
}

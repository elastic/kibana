/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest, IEsSearchResponse } from '../../../../../../src/plugins/data/common';
import { ValidationStrategyRequest, ValidationStrategyResponse } from './validation';

export enum EqlQueryTypes {
  validation = 'validation',
}

export interface EqlStrategyRequest extends IEsSearchRequest {
  factoryQueryType?: EqlQueryTypes;
}

export type EqlStrategyResponse = IEsSearchResponse;

export type EqlStrategyRequestType<T extends EqlQueryTypes> = T extends EqlQueryTypes.validation
  ? ValidationStrategyRequest
  : never;

export type EqlStrategyResponseType<T extends EqlQueryTypes> = T extends EqlQueryTypes.validation
  ? ValidationStrategyResponse
  : never;

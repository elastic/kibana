/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EqlStrategyRequest, EqlStrategyResponse } from '..';

export interface ValidationStrategyRequest extends EqlStrategyRequest {
  index: string[];
  query: string;
}

export interface ValidationStrategyResponse extends EqlStrategyResponse {
  valid: boolean;
  errors: string[];
}

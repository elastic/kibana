/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FactoryQueryTypes,
  Inspect,
  StrategyResponseType,
} from '../../../common/search_strategy/security_solution';

export type InspectResponse = Inspect & { response: string[] };

export const getInspectResponse = <T extends FactoryQueryTypes>(
  response: StrategyResponseType<T>,
  prevResponse: InspectResponse
): InspectResponse => ({
  dsl: response?.inspect?.dsl ?? prevResponse?.dsl ?? [],
  response: response != null ? [JSON.stringify(response, null, 2)] : prevResponse?.response,
});

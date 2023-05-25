/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchEngineFieldCapabilities } from '../../../../../common/types/engines';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchEngineFieldCapabilitiesApiParams {
  engineName: string;
}

export type FetchEngineFieldCapabilitiesApiResponse = EnterpriseSearchEngineFieldCapabilities;

export const fetchEngineFieldCapabilities = async ({
  engineName,
}: FetchEngineFieldCapabilitiesApiParams): Promise<FetchEngineFieldCapabilitiesApiResponse> => {
  const route = `/internal/enterprise_search/engines/${engineName}/field_capabilities`;

  return await HttpLogic.values.http.get<EnterpriseSearchEngineFieldCapabilities>(route);
};

export const FetchEngineFieldCapabilitiesApiLogic = createApiLogic(
  ['fetch_engine_field_capabilities_api_logic'],
  fetchEngineFieldCapabilities
);

export type FetchEngineFieldCapabilitiesApiLogicActions = Actions<
  FetchEngineFieldCapabilitiesApiParams,
  FetchEngineFieldCapabilitiesApiResponse
>;

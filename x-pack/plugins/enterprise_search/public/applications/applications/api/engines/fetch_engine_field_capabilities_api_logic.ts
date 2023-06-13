/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchApplicationFieldCapabilities } from '../../../../../common/types/search_applications';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchEngineFieldCapabilitiesApiParams {
  engineName: string;
}

export type FetchEngineFieldCapabilitiesApiResponse = EnterpriseSearchApplicationFieldCapabilities;

export const fetchEngineFieldCapabilities = async ({
  engineName,
}: FetchEngineFieldCapabilitiesApiParams): Promise<FetchEngineFieldCapabilitiesApiResponse> => {
  const route = `/internal/enterprise_search/search_applications/${engineName}/field_capabilities`;

  return await HttpLogic.values.http.get<EnterpriseSearchApplicationFieldCapabilities>(route);
};

export const FetchEngineFieldCapabilitiesApiLogic = createApiLogic(
  ['fetch_engine_field_capabilities_api_logic'],
  fetchEngineFieldCapabilities
);

export type FetchEngineFieldCapabilitiesApiLogicActions = Actions<
  FetchEngineFieldCapabilitiesApiParams,
  FetchEngineFieldCapabilitiesApiResponse
>;

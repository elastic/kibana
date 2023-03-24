/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsCollectionDataViewId } from '../../../../../common/types/analytics';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchAnalyticsCollectionDataViewIdAPILogicArgs {
  name: string;
}

export type FetchAnalyticsCollectionDataViewIdApiLogicResponse = AnalyticsCollectionDataViewId;

export const fetchAnalyticsCollectionDataViewId = async ({
  name,
}: FetchAnalyticsCollectionDataViewIdAPILogicArgs): Promise<FetchAnalyticsCollectionDataViewIdApiLogicResponse> => {
  const { http } = HttpLogic.values;
  const route = `/internal/enterprise_search/analytics/collections/${name}/data_view_id`;
  const response = await http.get<AnalyticsCollectionDataViewId>(route);

  return response;
};

export const FetchAnalyticsCollectionDataViewIdAPILogic = createApiLogic(
  ['analytics', 'analytics_collection_data_view_id_api_logic'],
  fetchAnalyticsCollectionDataViewId
);

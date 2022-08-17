/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback, useEffect, useState } from 'react';

export interface FetchAlertsArgs {
  featureIds: ValidFeatureId[];
}

export interface FetchAlertResp {
  alerts: EcsFieldsResponse[];
}

export type UseFetchAlerts = ({ featureIds }: FetchAlertsArgs) => [boolean, FetchAlertResp];

export const useFetchBrowserFieldCapabilities = ({ featureIds }: FetchAlertsArgs) => {
  const { http } = useKibana().services;
  const [state, setState] = useState(() => [true, {}]);

  const getBrowserFieldInfo = useCallback(async () => {
    if (!http) return Promise.resolve({});

    return await http.get<ValidFeatureId[]>(`${BASE_RAC_ALERTS_API_PATH}/browser_fields`, {
      query: { featureIds: featureIds.toString() },
    });
  }, [featureIds, http]);

  useEffect(() => {
    const callApi = async () => {
      const browserFieldsInfo = await getBrowserFieldInfo();
      setState([false, browserFieldsInfo]);
    };

    callApi();
  }, [getBrowserFieldInfo]);

  return state;
};

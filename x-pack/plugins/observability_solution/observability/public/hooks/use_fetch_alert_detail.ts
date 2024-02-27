/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { isEmpty } from 'lodash';

import { HttpSetup } from '@kbn/core/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { usePluginContext } from './use_plugin_context';

import { useDataFetcher } from './use_data_fetcher';
import { parseAlert } from '../pages/alerts/helpers/parse_alert';
import type { TopAlert } from '../typings/alerts';

interface AlertDetailParams {
  id: string;
}

export interface AlertData {
  formatted: TopAlert;
  raw: EcsFieldsResponse;
}

export const useFetchAlertDetail = (id: string): [boolean, AlertData | null] => {
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const params = useMemo(
    () => ({ id, ruleType: observabilityRuleTypeRegistry }),
    [id, observabilityRuleTypeRegistry]
  );

  const shouldExecuteApiCall = useCallback(
    (apiCallParams: AlertDetailParams) => !isEmpty(apiCallParams.id),
    []
  );

  const { loading, data: rawAlert } = useDataFetcher<AlertDetailParams, EcsFieldsResponse | null>({
    paramsForApiCall: params,
    initialDataState: null,
    executeApiCall: fetchAlert,
    shouldExecuteApiCall,
  });

  const data = rawAlert
    ? {
        formatted: parseAlert(observabilityRuleTypeRegistry)(rawAlert),
        raw: rawAlert,
      }
    : null;

  return [loading, data];
};

const fetchAlert = async (
  { id }: AlertDetailParams,
  abortController: AbortController,
  http: HttpSetup
) => {
  return http
    .get<EcsFieldsResponse>(BASE_RAC_ALERTS_API_PATH, {
      query: {
        id,
      },
      signal: abortController.signal,
    })
    .catch(() => {
      // ignore error for retrieving alert
      return null;
    });
};

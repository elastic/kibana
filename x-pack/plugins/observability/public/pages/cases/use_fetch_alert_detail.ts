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
import { usePluginContext } from '../../hooks/use_plugin_context';
import { TopAlert, parseAlert } from '../alerts';
import { ObservabilityRuleTypeRegistry } from '../..';
import { useDataFetcher } from './use_data_fetcher';

interface AlertDetailParams {
  id: string;
  ruleType: ObservabilityRuleTypeRegistry;
}

export const useFetchAlertDetail = (id: string): [boolean, TopAlert | null] => {
  const { observabilityRuleTypeRegistry } = usePluginContext();

  const params = useMemo(
    () => ({ id, ruleType: observabilityRuleTypeRegistry }),
    [id, observabilityRuleTypeRegistry]
  );

  const shouldExecuteApiCall = useCallback(
    (apiCallParams: AlertDetailParams) => !isEmpty(apiCallParams.id),
    []
  );

  const { loading, data: alert } = useDataFetcher<AlertDetailParams, TopAlert | null>({
    paramsForApiCall: params,
    initialDataState: null,
    executeApiCall: fetchAlert,
    shouldExecuteApiCall,
  });

  return [loading, alert];
};

const fetchAlert = async (
  params: AlertDetailParams,
  abortController: AbortController,
  http: HttpSetup
): Promise<TopAlert | null> => {
  const { id, ruleType } = params;
  try {
    const response = await http.get<Record<string, unknown>>(BASE_RAC_ALERTS_API_PATH, {
      query: {
        id,
      },
      signal: abortController.signal,
    });
    if (response !== undefined) {
      return parseAlert(ruleType)(response);
    }
  } catch (error) {
    // ignore error for retrieving alert
  }

  return null;
};

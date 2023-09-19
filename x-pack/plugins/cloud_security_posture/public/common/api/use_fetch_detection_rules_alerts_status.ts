/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery } from '@tanstack/react-query';
import {
  DETECTION_RULE_ALERTS_STATUS_API_CURRENT_VERSION,
  GET_DETECTION_RULE_ALERTS_STATUS_PATH,
} from '../../../common/constants';
import { DETECTION_ENGINE_ALERTS_KEY } from '../constants';

interface AlertStatus {
  acknowledged: number;
  closed: number;
  open: number;
  total: number;
}

export const useFetchDetectionRulesAlertsStatus = (tags: string[]) => {
  const { http } = useKibana().services;

  if (!http) {
    throw new Error('Kibana http service is not available');
  }

  return useQuery<AlertStatus, Error>([DETECTION_ENGINE_ALERTS_KEY, tags], () =>
    http.get<AlertStatus>(GET_DETECTION_RULE_ALERTS_STATUS_PATH, {
      version: DETECTION_RULE_ALERTS_STATUS_API_CURRENT_VERSION,
      query: { tags },
    })
  );
};

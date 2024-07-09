/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { STATUS_ROUTE_PATH, STATUS_API_CURRENT_VERSION } from '@kbn/cloud-security-posture-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture';
import { useKibana } from '../hooks/use_kibana';

const getCspSetupStatusQueryKey = 'csp_status_key';

export const useCspSetupStatusApi = (
  options?: UseQueryOptions<CspSetupStatus, unknown, CspSetupStatus>
) => {
  const { http } = useKibana().services;
  return useQuery<CspSetupStatus, unknown, CspSetupStatus>(
    [getCspSetupStatusQueryKey],
    () => http.get<CspSetupStatus>(STATUS_ROUTE_PATH, { version: STATUS_API_CURRENT_VERSION }),
    options
  );
};

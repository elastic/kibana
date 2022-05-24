/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../hooks/use_kibana';
import { CspSetupStatus } from '../../../common/types';
import { INFO_ROUTE_PATH } from '../../../common/constants';

const getCspSetupStatusQueryKey = 'csp_info_key';

export const useCspSetupStatusApi = () => {
  const { http } = useKibana().services;
  return useQuery([getCspSetupStatusQueryKey], () => http.get<CspSetupStatus>(INFO_ROUTE_PATH));
};

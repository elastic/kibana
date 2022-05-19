/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../hooks/use_kibana';
import { FindingsStatus } from '../../../common/types';
import { FINDINGS_STATUS_ROUTE_PATH } from '../../../common/constants';

const getStatsKey = 'csp_findings_status';

export const useFindingsStatusApi = () => {
  const { http } = useKibana().services;
  return useQuery([getStatsKey], () => http.get<FindingsStatus>(FINDINGS_STATUS_ROUTE_PATH));
};

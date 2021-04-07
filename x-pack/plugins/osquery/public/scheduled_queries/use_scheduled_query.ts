/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import {
  GetOnePackagePolicyResponse,
  PackagePolicy,
  packagePolicyRouteService,
} from '../../../fleet/common';

interface UseScheduledQuery {
  scheduledQueryId: string;
  skip?: boolean;
}

export const useScheduledQuery = ({ scheduledQueryId, skip = false }: UseScheduledQuery) => {
  const { http } = useKibana().services;

  return useQuery<GetOnePackagePolicyResponse, unknown, PackagePolicy>(
    ['scheduledQuery', { scheduledQueryId }],
    () => http.get(packagePolicyRouteService.getInfoPath(scheduledQueryId)),
    {
      keepPreviousData: true,
      enabled: !skip,
      select: (response) => response.item,
    }
  );
};

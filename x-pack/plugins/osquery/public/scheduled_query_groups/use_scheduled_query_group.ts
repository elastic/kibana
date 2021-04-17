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

interface UseScheduledQueryGroup {
  scheduledQueryGroupId: string;
  skip?: boolean;
}

export const useScheduledQueryGroup = ({
  scheduledQueryGroupId,
  skip = false,
}: UseScheduledQueryGroup) => {
  const { http } = useKibana().services;

  return useQuery<GetOnePackagePolicyResponse, unknown, PackagePolicy>(
    ['scheduledQueryGroup', { scheduledQueryGroupId }],
    () => http.get(packagePolicyRouteService.getInfoPath(scheduledQueryGroupId)),
    {
      keepPreviousData: true,
      enabled: !skip,
      select: (response) => response.item,
    }
  );
};

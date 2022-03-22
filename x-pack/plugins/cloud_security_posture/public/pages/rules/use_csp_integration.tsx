/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { type PageUrlParams } from './rules_container';
import { useKibana } from '../../common/hooks/use_kibana';
import { type PackagePolicy, packagePolicyRouteService } from '../../../../../plugins/fleet/common';

export const useCspIntegration = ({ packagePolicyId }: PageUrlParams) => {
  const { http } = useKibana().services;
  return useQuery(
    ['packagePolicy', { packagePolicyId }],
    () => http.get<{ item: PackagePolicy }>(packagePolicyRouteService.getInfoPath(packagePolicyId)),
    { select: (response) => response.item, enabled: !!packagePolicyId }
  );
};

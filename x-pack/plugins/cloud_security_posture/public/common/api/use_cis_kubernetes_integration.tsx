/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import {
  epmRouteService,
  type GetInfoResponse,
  type DefaultPackagesInstallationError,
} from '@kbn/fleet-plugin/common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../../common/constants';
import { useKibana } from '../hooks/use_kibana';

/**
 * This hook will find our cis integration and return its PackageInfo
 * */
export const useCisKubernetesIntegration = () => {
  const { http } = useKibana().services;

  return useQuery<GetInfoResponse, DefaultPackagesInstallationError>(['integrations'], () =>
    http.get<GetInfoResponse>(epmRouteService.getInfoPath(CLOUD_SECURITY_POSTURE_PACKAGE_NAME), {
      query: { experimental: true },
    })
  );
};

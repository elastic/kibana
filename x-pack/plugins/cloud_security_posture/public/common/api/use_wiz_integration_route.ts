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
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useKibana } from '../hooks/use_kibana';

const useWizIntegration = () => {
  const { http } = useKibana().services;

  return useQuery<GetInfoResponse, DefaultPackagesInstallationError>(['integrations'], () =>
    http.get<GetInfoResponse>(epmRouteService.getInfoPath('wiz'))
  );
};

export const useWizIntegrationRoute = (): string | undefined => {
  const { http } = useKibana().services;
  const wizIntegration = useWizIntegration();

  if (!wizIntegration.isSuccess) return;

  const path = pagePathGetters
    .integration_details_overview({
      pkgkey: 'wiz',
    })
    .join('');

  return http.basePath.prepend(path);
};

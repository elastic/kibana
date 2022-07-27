/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters, pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public';
import { useCisKubernetesIntegration } from '../api/use_cis_kubernetes_integration';
import { useKibana } from '../hooks/use_kibana';

export const useCISIntegrationLink = (): string | undefined => {
  const { http } = useKibana().services;
  const cisIntegration = useCisKubernetesIntegration();

  if (!cisIntegration.isSuccess) return;

  const path = pagePathGetters
    .integration_details_overview({
      pkgkey: pkgKeyFromPackageInfo({
        name: cisIntegration.data.item.name,
        version: cisIntegration.data.item.version,
      }),
    })
    .join('/');

  return http.basePath.prepend(path);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters, pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public';
import { useCspIntegrationPackagePolicyApi } from '../api/use_csp_integration_package_policy_api';
import { useCisKubernetesIntegration } from '../api/use_cis_kubernetes_integration';
import { useKibana } from '../hooks/use_kibana';

export const useCISIntegrationPoliciesLink = (): string | undefined => {
  const { http } = useKibana().services;
  const cisIntegration = useCisKubernetesIntegration();

  const p = useCspIntegrationPackagePolicyApi();

  if (!cisIntegration.isSuccess) return;

  const path = pagePathGetters
    .integration_details_policies({
      addAgentToPolicyId: 'f0663b40-f206-11ec-8ca2-d9b3ef056795',
      integration: 'ca7c73d4-fa72-46c3-9db5-71db04ee8120',
      pkgkey: pkgKeyFromPackageInfo({
        name: cisIntegration.data.item.name,
        version: cisIntegration.data.item.version,
      }),
    })
    .join('/');

  return http.basePath.prepend(path);
};

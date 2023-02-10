/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters, pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public';
import { INTEGRATION_PACKAGE_NAME } from '../../../common/constants';
import { useCloudDefendIntegration } from '../api/use_cloud_defend_integration';
import { useKibana } from '../hooks/use_kibana';

export const useCloudDefendIntegrationLink = (): string | undefined => {
  const { http } = useKibana().services;
  const cloudDefendIntegration = useCloudDefendIntegration();

  if (!cloudDefendIntegration.isSuccess) return;

  const path = pagePathGetters
    .add_integration_to_policy({
      integration: INTEGRATION_PACKAGE_NAME,
      pkgkey: pkgKeyFromPackageInfo({
        name: cloudDefendIntegration.data.item.name,
        version: cloudDefendIntegration.data.item.version,
      }),
    })
    .join('');

  return http.basePath.prepend(path);
};

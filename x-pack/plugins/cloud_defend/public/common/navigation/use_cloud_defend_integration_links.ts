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

export const useCloudDefendIntegrationLinks = (): {
  addIntegrationLink: string | undefined;
  docsLink: string;
} => {
  const { http } = useKibana().services;
  const cloudDefendIntegration = useCloudDefendIntegration();

  if (!cloudDefendIntegration.isSuccess)
    return {
      addIntegrationLink: undefined,
      docsLink: 'https://www.elastic.co/guide/index.html',
    };

  const addIntegrationLink = pagePathGetters
    .add_integration_to_policy({
      integration: INTEGRATION_PACKAGE_NAME,
      pkgkey: pkgKeyFromPackageInfo({
        name: cloudDefendIntegration.data.item.name,
        version: cloudDefendIntegration.data.item.version,
      }),
    })
    .join('');

  const docsLink = pagePathGetters
    .integration_details_overview({
      integration: INTEGRATION_PACKAGE_NAME,
      pkgkey: pkgKeyFromPackageInfo({
        name: cloudDefendIntegration.data.item.name,
        version: cloudDefendIntegration.data.item.version,
      }),
    })
    .join('');

  return {
    addIntegrationLink: http.basePath.prepend(addIntegrationLink),
    docsLink: http.basePath.prepend(docsLink),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { useQuery } from 'react-query';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { PackageInfo, epmRouteService } from '../../../../fleet/common';
import { CIS_KUBERNETES_PACKAGE_NAME } from '../../../common/constants';

const CIS_KUBERNETES_INTEGRATION_VERSION = '0.0.1';

/**
 * This hook will find our cis intergation and return it's PackageInfo
 * */
export const useCisKubernetesIntegration = () => {
  const { http } = useKibana<CoreStart>().services;

  const integrationQuery = useQuery(['integrations'], () =>
    http.get<{ item: PackageInfo }>(
      epmRouteService.getInfoPath(CIS_KUBERNETES_PACKAGE_NAME, CIS_KUBERNETES_INTEGRATION_VERSION),
      {
        query: { experimental: true },
      }
    )
  );

  if (integrationQuery.isError) throw new Error('Could not fetch integraions');

  if (integrationQuery.isSuccess && !integrationQuery.data?.item)
    throw new Error(
      `name: ${CIS_KUBERNETES_PACKAGE_NAME}, version: ${CIS_KUBERNETES_INTEGRATION_VERSION}, was not found in integraions list`
    );

  return integrationQuery.data?.item;
};

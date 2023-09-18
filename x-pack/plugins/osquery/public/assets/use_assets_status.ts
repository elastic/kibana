/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';
import { useQuery } from '@tanstack/react-query';
import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { INTEGRATION_ASSETS_STATUS_ID } from './constants';

export const useAssetsStatus = () => {
  const { http } = useKibana().services;

  return useQuery<{
    install: KibanaAssetReference[];
    update: KibanaAssetReference[];
    upToDate: KibanaAssetReference[];
  }>(
    [INTEGRATION_ASSETS_STATUS_ID],
    () => http.get('/internal/osquery/assets', { version: API_VERSIONS.internal.v1 }),
    {
      keepPreviousData: true,
      retry: false,
    }
  );
};

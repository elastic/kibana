/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse } from 'axios';

import type { KbnClient } from '@kbn/test';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import { epmRouteService } from '@kbn/fleet-plugin/common';

export const getEndpointPackageInfo = async (
  kbnClient: KbnClient
): Promise<GetInfoResponse['item']> => {
  const path = epmRouteService.getInfoPath('endpoint');
  const endpointPackage = (
    (await kbnClient.request({
      path,
      method: 'GET',
    })) as AxiosResponse<GetInfoResponse>
  ).data.item;

  if (!endpointPackage) {
    throw new Error('EPM Endpoint package was not found!');
  }

  return endpointPackage;
};

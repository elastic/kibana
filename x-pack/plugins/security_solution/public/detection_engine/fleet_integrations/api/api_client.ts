/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInstalledIntegrationsResponse } from '../../../../common/detection_engine/fleet_integrations';
import { GET_INSTALLED_INTEGRATIONS_URL } from '../../../../common/detection_engine/fleet_integrations';
import { KibanaServices } from '../../../common/lib/kibana';

import type {
  FetchInstalledIntegrationsArgs,
  IFleetIntegrationsApiClient,
} from './api_client_interface';

export const fleetIntegrationsApi: IFleetIntegrationsApiClient = {
  fetchInstalledIntegrations: (
    args: FetchInstalledIntegrationsArgs
  ): Promise<GetInstalledIntegrationsResponse> => {
    const { packages, signal } = args;

    return http().fetch<GetInstalledIntegrationsResponse>(GET_INSTALLED_INTEGRATIONS_URL, {
      method: 'GET',
      query: {
        packages: packages?.sort()?.join(','),
      },
      signal,
    });
  },
};

const http = () => KibanaServices.get().http;

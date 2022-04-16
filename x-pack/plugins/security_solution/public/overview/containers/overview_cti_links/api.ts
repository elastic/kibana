/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import { KibanaServices } from '../../../common/lib/kibana';

export interface IntegrationResponse {
  id: string;
  status: string;
  savedObject?: {
    attributes?: {
      installed_kibana: Array<{
        type: string;
        id: string;
      }>;
    };
  };
}

export const fetchFleetIntegrations = () =>
  KibanaServices.get().http.fetch<{
    response: IntegrationResponse[];
  }>(EPM_API_ROUTES.LIST_PATTERN, {
    method: 'GET',
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { transformKibanaApplicationsFromEs } from './transform_kibana_applications_from_es';
import { TransformApplicationsFromEsResponse } from './types';

export type GetPrivilegesWithRequest = (
  request: Legacy.Request
) => Promise<TransformApplicationsFromEsResponse>;

export function getPrivilegesWithRequestFactory(
  application: string,
  shieldClient: any
): GetPrivilegesWithRequest {
  const { callWithRequest } = shieldClient;

  return async function getPrivilegesWithRequest(
    request: Legacy.Request
  ): Promise<TransformApplicationsFromEsResponse> {
    const userPrivilegesResponse = await callWithRequest(request, 'shield.userPrivileges');

    return transformKibanaApplicationsFromEs(application, userPrivilegesResponse.applications);
  };
}

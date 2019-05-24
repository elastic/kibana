/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { RoleKibanaPrivilege } from '../../../common/model';
import { transformKibanaApplicationsFromEs } from './transform_applications_from_es';

export type GetPrivilegesWithRequest = (request: Legacy.Request) => Promise<RoleKibanaPrivilege[]>;

export function getPrivilegesWithRequestFactory(
  application: string,
  shieldClient: any
): GetPrivilegesWithRequest {
  const { callWithRequest } = shieldClient;

  return async function getPrivilegesWithRequest(
    request: Legacy.Request
  ): Promise<RoleKibanaPrivilege[]> {
    const userPrivilegesResponse = await callWithRequest(request, 'shield.userPrivileges');
    const { value = [] } = transformKibanaApplicationsFromEs(
      application,
      userPrivilegesResponse.applications,
      { allowDuplicateResources: true }
    );

    return value;
  };
}

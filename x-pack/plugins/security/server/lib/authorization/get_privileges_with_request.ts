/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { RESERVED_PRIVILEGES_APPLICATION_WILDCARD } from '../../../common/constants';

export type GetPrivilegesWithRequest = (request: Legacy.Request) => Promise<EsApplication[]>;
export interface EsApplication {
  application: string;
  privileges: string[];
  resources: string[];
}

export function getPrivilegesWithRequestFactory(
  application: string,
  shieldClient: any
): GetPrivilegesWithRequest {
  const { callWithRequest } = shieldClient;

  return async function getPrivilegesWithRequest(
    request: Legacy.Request
  ): Promise<EsApplication[]> {
    const userPrivilegesResponse = await callWithRequest(request, 'shield.userPrivileges');
    return (userPrivilegesResponse.applications as EsApplication[]).filter(
      app =>
        app.application === application ||
        app.application === RESERVED_PRIVILEGES_APPLICATION_WILDCARD
    );
  };
}

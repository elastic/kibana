/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';

export interface ApmDataAccessPrivilegesCheck {
  request: KibanaRequest;
  security?: SecurityPluginStart;
  getApmIndices: (request: KibanaRequest) => Promise<APMIndices>;
}

export function convertIndiciesToPrivilege(apmIndices: APMIndices) {
  return Object.values(apmIndices)
    .flatMap((value) => value.split(','))
    .reduce<Record<string, string[]>>((obj, item, index) => {
      obj[item] = ['read'];
      return obj;
    }, {});
}

export async function checkPrivileges({
  request,
  getApmIndices,
  security,
}: ApmDataAccessPrivilegesCheck) {
  const authorization = security?.authz;
  if (!authorization) {
    return true;
  }

  const [apmIndices, checkPrivilegesFn] = await Promise.all([
    getApmIndices(request),
    authorization.checkPrivilegesDynamicallyWithRequest(request),
  ]);

  const { hasAllRequested } = await checkPrivilegesFn({
    elasticsearch: {
      cluster: [],
      index: convertIndiciesToPrivilege(apmIndices),
    },
  });
  return hasAllRequested;
}

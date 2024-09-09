/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { mapValues } from 'lodash';
import { APMIndices } from '..';

export interface ApmDataAccessPrivilegesCheck {
  request: KibanaRequest;
  security?: SecurityPluginStart;
  getApmIndices: () => Promise<APMIndices>;
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
    getApmIndices(),
    authorization.checkPrivilegesDynamicallyWithRequest(request),
  ]);

  const { hasAllRequested } = await checkPrivilegesFn({
    elasticsearch: {
      cluster: [],
      index: mapValues(apmIndices, () => ['read']),
    },
  });

  return hasAllRequested;
}

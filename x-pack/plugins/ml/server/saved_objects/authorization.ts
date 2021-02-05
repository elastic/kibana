/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import type { SecurityPluginSetup } from '../../../security/server';
import { ML_SAVED_OBJECT_TYPE } from '../../common/types/saved_objects';

export function authorizationProvider(authorization: SecurityPluginSetup['authz']) {
  async function authorizationCheck(request: KibanaRequest) {
    const shouldAuthorizeRequest = authorization?.mode.useRbacForRequest(request) ?? false;

    if (shouldAuthorizeRequest === false) {
      return {
        canCreateGlobally: true,
        canCreateAtSpace: true,
      };
    }

    const checkPrivilegesWithRequest = authorization.checkPrivilegesWithRequest(request);
    // Checking privileges "dynamically" will check against the current space, if spaces are enabled.
    // If spaces are disabled, then this will check privileges globally instead.
    // SO, if spaces are disabled, then you don't technically need to perform this check, but I included it here
    // for completeness.
    const checkPrivilegesDynamicallyWithRequest = authorization.checkPrivilegesDynamicallyWithRequest(
      request
    );
    const createMLJobAuthorizationAction = authorization.actions.savedObject.get(
      ML_SAVED_OBJECT_TYPE,
      'create'
    );
    const canCreateGlobally = (
      await checkPrivilegesWithRequest.globally({
        kibana: [createMLJobAuthorizationAction],
      })
    ).hasAllRequested;
    const canCreateAtSpace = (
      await checkPrivilegesDynamicallyWithRequest({ kibana: [createMLJobAuthorizationAction] })
    ).hasAllRequested;
    return {
      canCreateGlobally,
      canCreateAtSpace,
    };
  }

  return { authorizationCheck };
}

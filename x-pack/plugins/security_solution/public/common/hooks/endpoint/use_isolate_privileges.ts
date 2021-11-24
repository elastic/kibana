/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useKibana } from '../../lib/kibana';
import { useLicense } from '../use_license';
import { AuthenticatedUser } from '../../../../../security/common';

interface IsolationPrivilegesStatus {
  isUnisolationAllowed: boolean;
  isIsolationAllowed: boolean;
  isViewActivityLogAllowed: boolean;
}

/*
 * Host isolation requires superuser privileges and at least a platinum license
 */
export const useIsolationPrivileges = (): IsolationPrivilegesStatus => {
  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const services = useKibana().services;
  const pluginUserPrivileges = services.application.capabilities.securitySolutionEndpoint;
  const hasIsolationPrivilege = !!pluginUserPrivileges.writeIsolationActions;

  const { data: user } = useQuery<AuthenticatedUser>(
    'authenticatedUserInfo',
    () => services.security.authc.getCurrentUser(),
    {
      refetchOnMount: true,
    }
  );
  if (typeof user !== 'undefined') {
    // if logged in user data exists
    // verify if also has write privileges for isolation/unisolation
    return {
      isUnisolationAllowed: hasIsolationPrivilege,
      isIsolationAllowed: hasIsolationPrivilege && isPlatinumPlus, // also check if has platinumPlus license
      isViewActivityLogAllowed: !!pluginUserPrivileges.readIsolationActionsAndResponses,
    };
  }

  return {
    isUnisolationAllowed: false,
    isIsolationAllowed: false,
    isViewActivityLogAllowed: false,
  };
};

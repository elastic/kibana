/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { userCanIsolate } from '../../../../common/endpoint/actions';
import { useKibana } from '../../lib/kibana';
import { useLicense } from '../use_license';

interface IsolationPriviledgesStatus {
  isLoading: boolean;
  isAllowed: boolean;
}

/*
 * Host isolation requires superuser privileges and at least a platinum license
 */
export const useIsolationPrivileges = (): IsolationPriviledgesStatus => {
  const [isLoading, setIsLoading] = useState(false);
  const [canIsolate, setCanIsolate] = useState(false);

  const isPlatinumPlus = useLicense().isPlatinumPlus();
  const services = useKibana().services;

  useEffect(() => {
    setIsLoading(true);
    const user = services.security.authc.getCurrentUser();
    if (user) {
      user.then((authenticatedUser) => {
        setCanIsolate(userCanIsolate(authenticatedUser.roles));
        setIsLoading(false);
      });
    }
  }, [services.security.authc]);

  return { isLoading, isAllowed: canIsolate && isPlatinumPlus ? true : false };
};

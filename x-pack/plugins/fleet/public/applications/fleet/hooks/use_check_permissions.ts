/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { sendGetPermissionsCheck } from '../../../hooks';

export const useCheckPermissions = () => {
  const [isPermissionsLoading, setIsPermissionsLoading] = useState<boolean>(false);
  const [permissionsError, setPermissionsError] = useState<string>();

  useEffect(() => {
    async function checkPermissions() {
      setIsPermissionsLoading(false);
      setPermissionsError(undefined);

      try {
        setIsPermissionsLoading(true);
        const permissionsResponse = await sendGetPermissionsCheck(true);

        setIsPermissionsLoading(false);
        if (!permissionsResponse.data?.success) {
          setPermissionsError(permissionsResponse.data?.error || 'REQUEST_ERROR');
        }
      } catch (err) {
        setPermissionsError('REQUEST_ERROR');
      }
    }
    checkPermissions();
  }, []);

  return { isPermissionsLoading, permissionsError };
};

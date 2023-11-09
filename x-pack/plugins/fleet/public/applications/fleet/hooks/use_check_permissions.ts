/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';

import { sendGetPermissionsCheck } from '../../../hooks';

async function checkPermissions() {
  let permissionsError;

  try {
    const permissionsResponse = await sendGetPermissionsCheck(true);

    if (!permissionsResponse.data?.success) {
      permissionsError = permissionsResponse.data?.error || 'REQUEST_ERROR';
    }
  } catch (err) {
    permissionsError = 'REQUEST_ERROR';
  }
  return permissionsError;
}

export const useCheckPermissions = () => {
  const { data: permissionsError, status } = useQuery(
    ['fetch-check-permissions'],
    checkPermissions
  );
  return { isPermissionsLoading: status === 'loading', permissionsError };
};

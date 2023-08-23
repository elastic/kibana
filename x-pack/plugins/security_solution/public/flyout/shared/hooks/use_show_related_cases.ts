/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetUserCasesPermissions } from '../../../common/lib/kibana';

/**
 * Returns true if the user has read privileges for cases, false otherwise
 */
export const useShowRelatedCases = (): boolean => {
  const userCasesPermissions = useGetUserCasesPermissions();
  return userCasesPermissions.read;
};

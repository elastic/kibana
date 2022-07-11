/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../common/lib/kibana';

const CASES_FEATURE_ID = 'securitySolutionCases' as const;

interface UseGetUserCasesPermissions {
  crud: boolean;
  read: boolean;
}
export const useGetUserCasesPermissions = () => {
  const [casesPermissions, setCasesPermissions] = useState<UseGetUserCasesPermissions>({
    crud: false,
    read: false,
  });
  const uiCapabilities = useKibana().services.application.capabilities;

  useEffect(() => {
    setCasesPermissions({
      crud: !!uiCapabilities[CASES_FEATURE_ID]?.crud_cases,
      read: !!uiCapabilities[CASES_FEATURE_ID]?.read_cases,
    });
  }, [uiCapabilities]);

  return casesPermissions;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../utils/kibana_react';
import { CASES_APP_ID } from '../../common/const';

export interface UseGetUserCasesPermissions {
  crud: boolean;
  read: boolean;
}

export function useGetUserCasesPermissions() {
  const [casesPermissions, setCasesPermissions] = useState<UseGetUserCasesPermissions | null>(null);
  const uiCapabilities = useKibana().services.application.capabilities;

  useEffect(() => {
    const capabilitiesCanUserCRUD: boolean =
      typeof uiCapabilities[CASES_APP_ID].crud_cases === 'boolean'
        ? (uiCapabilities[CASES_APP_ID].crud_cases as boolean)
        : false;
    const capabilitiesCanUserRead: boolean =
      typeof uiCapabilities[CASES_APP_ID].read_cases === 'boolean'
        ? (uiCapabilities[CASES_APP_ID].read_cases as boolean)
        : false;
    setCasesPermissions({
      crud: capabilitiesCanUserCRUD,
      read: capabilitiesCanUserRead,
    });
  }, [uiCapabilities]);

  return casesPermissions;
}

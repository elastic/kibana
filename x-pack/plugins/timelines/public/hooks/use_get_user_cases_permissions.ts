/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { TimelinesStartPlugins } from '../types';

export interface UseGetUserCasesPermissions {
  crud: boolean;
  read: boolean;
}
export const useGetUserCasesPermissions = (featureId: string) => {
  const [casesPermissions, setCasesPermissions] = useState<UseGetUserCasesPermissions | null>(null);
  const uiCapabilities = useKibana<TimelinesStartPlugins>().services?.application?.capabilities;

  useEffect(() => {
    const capabilitiesCanUserCRUD: boolean =
      uiCapabilities && typeof uiCapabilities[featureId].crud_cases === 'boolean'
        ? uiCapabilities[featureId].crud_cases
        : false;
    const capabilitiesCanUserRead: boolean =
      uiCapabilities && typeof uiCapabilities[featureId].read_cases === 'boolean'
        ? uiCapabilities[featureId].read_cases
        : false;
    setCasesPermissions({
      crud: capabilitiesCanUserCRUD,
      read: capabilitiesCanUserRead,
    });
  }, [uiCapabilities, featureId]);

  return casesPermissions;
};

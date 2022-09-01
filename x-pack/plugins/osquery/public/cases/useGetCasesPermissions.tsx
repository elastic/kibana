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
  all: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  push: boolean;
}

export const useGetUserCasesPermissions = () => {
  const [casesPermissions, setCasesPermissions] = useState<UseGetUserCasesPermissions>({
    all: false,
    create: false,
    read: false,
    update: false,
    delete: false,
    push: false,
  });
  const uiCapabilities = useKibana().services.application.capabilities;
  const casesCapabilities = useKibana().services.cases.helpers.getUICapabilities(
    uiCapabilities[CASES_FEATURE_ID]
  );

  useEffect(() => {
    setCasesPermissions({
      all: casesCapabilities.all,
      create: casesCapabilities.create,
      read: casesCapabilities.read,
      update: casesCapabilities.update,
      delete: casesCapabilities.delete,
      push: casesCapabilities.push,
    });
  }, [
    casesCapabilities.all,
    casesCapabilities.create,
    casesCapabilities.read,
    casesCapabilities.update,
    casesCapabilities.delete,
    casesCapabilities.push,
  ]);

  return casesPermissions;
};

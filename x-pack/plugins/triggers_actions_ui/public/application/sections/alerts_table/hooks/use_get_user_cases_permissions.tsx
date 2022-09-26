/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface CasesPermissions {
  all: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  push: boolean;
}

interface CasesUserPermissions {
  helpers: {
    getUICapabilities: (
      featureCapabilities?: Partial<Record<string, boolean | Record<string, boolean>>>
    ) => CasesPermissions;
  };
}

export function useGetUserCasesPermissions(casesFeatureId: string) {
  const [casesPermissions, setCasesPermissions] = useState<CasesPermissions>({
    all: false,
    read: false,
    create: false,
    update: false,
    delete: false,
    push: false,
  });
  const uiCapabilities = useKibana().services.application?.capabilities;

  const casesCapabilities = useKibana<{
    cases: CasesUserPermissions;
  }>().services.cases.helpers.getUICapabilities(uiCapabilities![casesFeatureId]);

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
}

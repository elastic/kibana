/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../utils/kibana_react';
import { casesFeatureId } from '../../common';

export interface UseGetUserCasesPermissions {
  all: boolean;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export function useGetUserCasesPermissions() {
  const [casesPermissions, setCasesPermissions] = useState<UseGetUserCasesPermissions>({
    all: false,
    read: false,
    create: false,
    update: false,
    delete: false,
  });
  const uiCapabilities = useKibana().services.application.capabilities;

  const casesCapabilities = useKibana().services.cases.helpers.getUICapabilities(
    uiCapabilities[casesFeatureId]
  );

  useEffect(() => {
    setCasesPermissions({
      all: casesCapabilities.all,
      read: casesCapabilities.read,
      update: casesCapabilities.update,
      delete: casesCapabilities.delete,
      create: casesCapabilities.create,
    });
  }, [casesCapabilities]);

  return casesPermissions;
}

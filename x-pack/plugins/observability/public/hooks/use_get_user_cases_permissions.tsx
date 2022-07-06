/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { CasesPermissions } from '@kbn/cases-plugin/common';
import { useKibana } from '../utils/kibana_react';
import { casesFeatureId } from '../../common';

export function useGetUserCasesPermissions() {
  const [casesPermissions, setCasesPermissions] = useState<CasesPermissions>({
    all: false,
    read: false,
    create: false,
    update: false,
    delete: false,
    push: false,
  });
  const uiCapabilities = useKibana().services.application.capabilities;

  const casesCapabilities = useKibana().services.cases.helpers.getUICapabilities(
    uiCapabilities[casesFeatureId]
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
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { CasesPermissions } from '@kbn/cases-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { casesFeatureId } from '../../common';
import { ObservabilitySharedStart } from '../plugin';

export function useGetUserCasesPermissions() {
  const [casesPermissions, setCasesPermissions] = useState<CasesPermissions>({
    all: false,
    read: false,
    create: false,
    update: false,
    delete: false,
    push: false,
    connectors: false,
  });
  const uiCapabilities = useKibana().services.application!.capabilities;

  const casesCapabilities =
    useKibana<ObservabilitySharedStart>().services.cases.helpers.getUICapabilities(
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
      connectors: casesCapabilities.connectors,
    });
  }, [
    casesCapabilities.all,
    casesCapabilities.create,
    casesCapabilities.read,
    casesCapabilities.update,
    casesCapabilities.delete,
    casesCapabilities.push,
    casesCapabilities.connectors,
  ]);

  return casesPermissions;
}

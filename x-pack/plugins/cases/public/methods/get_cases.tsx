/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { CasesProps } from '../components/app';
import { CasesProvider, CasesContextProps } from '../components/cases_context';

export type GetCasesProps = CasesProps & CasesContextProps;

const CasesLazy: React.FC<CasesProps> = lazy(() => import('../components/app'));
export const getCasesLazy = ({
  owner,
  userCanCrud,
  basePath,
  disableAlerts,
  onComponentInitialized,
  actionsNavigation,
  ruleDetailsNavigation,
  showAlertDetails,
  useFetchAlertData,
  refreshRef,
  hideSyncAlerts,
  timelineIntegration,
}: GetCasesProps) => (
  <CasesProvider value={{ owner, userCanCrud, basePath }}>
    <Suspense fallback={<EuiLoadingSpinner />}>
      <CasesLazy
        disableAlerts={disableAlerts}
        onComponentInitialized={onComponentInitialized}
        actionsNavigation={actionsNavigation}
        ruleDetailsNavigation={ruleDetailsNavigation}
        showAlertDetails={showAlertDetails}
        useFetchAlertData={useFetchAlertData}
        refreshRef={refreshRef}
        hideSyncAlerts={hideSyncAlerts}
        timelineIntegration={timelineIntegration}
      />
    </Suspense>
  </CasesProvider>
);

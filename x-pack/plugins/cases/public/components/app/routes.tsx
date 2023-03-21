/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useCallback } from 'react';
import { Redirect, Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AllCases } from '../all_cases';
import { CreateCase } from '../create';
import { ConfigureCases } from '../configure_cases';
import type { CasesRoutesProps } from './types';
import { useCasesContext } from '../cases_context/use_cases_context';
import {
  getCasesConfigurePath,
  getCreateCasePath,
  getCaseViewPath,
  getCaseViewWithCommentPath,
  useAllCasesNavigation,
  useCaseViewNavigation,
} from '../../common/navigation';
import { NoPrivilegesPage } from '../no_privileges';
import * as i18n from './translations';
import { useReadonlyHeader } from './use_readonly_header';
import { casesQueryClient } from '../cases_context/query_client';
import type { CaseViewProps } from '../case_view/types';

const CaseViewLazy: React.FC<CaseViewProps> = lazy(() => import('../case_view'));

const CasesRoutesComponent: React.FC<CasesRoutesProps> = ({
  onComponentInitialized,
  actionsNavigation,
  ruleDetailsNavigation,
  showAlertDetails,
  useFetchAlertData,
  refreshRef,
  timelineIntegration,
}) => {
  const { basePath, permissions } = useCasesContext();
  const { navigateToAllCases } = useAllCasesNavigation();
  const { navigateToCaseView } = useCaseViewNavigation();
  useReadonlyHeader();

  const onCreateCaseSuccess = useCallback(
    async ({ id }) => navigateToCaseView({ detailName: id }),
    [navigateToCaseView]
  );

  return (
    <QueryClientProvider client={casesQueryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <Switch>
        <Route strict exact path={basePath}>
          <AllCases />
        </Route>

        <Route path={getCreateCasePath(basePath)}>
          {permissions.create ? (
            <CreateCase
              onSuccess={onCreateCaseSuccess}
              onCancel={navigateToAllCases}
              timelineIntegration={timelineIntegration}
            />
          ) : (
            <NoPrivilegesPage pageName={i18n.CREATE_CASE_PAGE_NAME} />
          )}
        </Route>

        <Route path={getCasesConfigurePath(basePath)}>
          {permissions.update ? (
            <ConfigureCases />
          ) : (
            <NoPrivilegesPage pageName={i18n.CONFIGURE_CASES_PAGE_NAME} />
          )}
        </Route>

        <Route exact path={[getCaseViewWithCommentPath(basePath), getCaseViewPath(basePath)]}>
          <Suspense fallback={<EuiLoadingSpinner />}>
            <CaseViewLazy
              onComponentInitialized={onComponentInitialized}
              actionsNavigation={actionsNavigation}
              ruleDetailsNavigation={ruleDetailsNavigation}
              showAlertDetails={showAlertDetails}
              useFetchAlertData={useFetchAlertData}
              refreshRef={refreshRef}
              timelineIntegration={timelineIntegration}
            />
          </Suspense>
        </Route>

        <Route path={basePath}>
          <Redirect to={basePath} />
        </Route>
      </Switch>
    </QueryClientProvider>
  );
};
CasesRoutesComponent.displayName = 'CasesRoutes';

export const CasesRoutes = React.memo(CasesRoutesComponent);
// eslint-disable-next-line import/no-default-export
export { CasesRoutes as default };

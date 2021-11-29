/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { AllCases } from '../all_cases';
import { CaseView } from '../case_view';
import { CreateCase } from '../create';
import { ConfigureCases } from '../configure_cases';
import { CasesRoutesProps } from './types';
import { useCasesContext } from '../cases_context/use_cases_context';
import {
  getCasesConfigurePath,
  getCreateCasePath,
  getCaseViewPath,
  getCaseViewWithCommentPath,
  getSubCaseViewPath,
  getSubCaseViewWithCommentPath,
  useAllCasesNavigation,
  useCaseViewNavigation,
} from '../../common/navigation';
import { NoPrivilegesPage } from '../no_privileges';
import * as i18n from './translations';
import { useReadonlyHeader } from './use_readonly_header';

const CasesRoutesComponent: React.FC<CasesRoutesProps> = ({
  disableAlerts,
  onComponentInitialized,
  actionsNavigation,
  ruleDetailsNavigation,
  showAlertDetails,
  useFetchAlertData,
  refreshRef,
  hideSyncAlerts,
  timelineIntegration,
}) => {
  const { basePath, userCanCrud } = useCasesContext();
  const { navigateToAllCases } = useAllCasesNavigation();
  const { navigateToCaseView } = useCaseViewNavigation();
  useReadonlyHeader();

  const onCreateCaseSuccess = useCallback(
    async ({ id }) => navigateToCaseView({ detailName: id }),
    [navigateToCaseView]
  );

  return (
    <Switch>
      <Route strict exact path={basePath}>
        <AllCases disableAlerts={disableAlerts} />
      </Route>

      <Route path={getCreateCasePath(basePath)}>
        {userCanCrud ? (
          <CreateCase
            onSuccess={onCreateCaseSuccess}
            onCancel={navigateToAllCases}
            disableAlerts={disableAlerts}
            timelineIntegration={timelineIntegration}
          />
        ) : (
          <NoPrivilegesPage pageName={i18n.CREATE_CASE_PAGE_NAME} />
        )}
      </Route>

      <Route path={getCasesConfigurePath(basePath)}>
        {userCanCrud ? (
          <ConfigureCases />
        ) : (
          <NoPrivilegesPage pageName={i18n.CONFIGURE_CASES_PAGE_NAME} />
        )}
      </Route>

      <Route
        exact
        path={[
          getSubCaseViewWithCommentPath(basePath),
          getCaseViewWithCommentPath(basePath),
          getSubCaseViewPath(basePath),
          getCaseViewPath(basePath),
        ]}
      >
        <CaseView
          onComponentInitialized={onComponentInitialized}
          actionsNavigation={actionsNavigation}
          ruleDetailsNavigation={ruleDetailsNavigation}
          showAlertDetails={showAlertDetails}
          useFetchAlertData={useFetchAlertData}
          refreshRef={refreshRef}
          hideSyncAlerts={hideSyncAlerts}
          timelineIntegration={timelineIntegration}
        />
      </Route>

      <Route path={basePath}>
        <Redirect to={basePath} />
      </Route>
    </Switch>
  );
};

export const CasesRoutes = React.memo(CasesRoutesComponent);

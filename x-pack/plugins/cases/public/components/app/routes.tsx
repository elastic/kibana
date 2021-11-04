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
import { ConfigureCase } from '../configure_cases';
import { CasesRoutesProps } from './types';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useAllCasesNavigation, useCaseViewNavigation } from '../../common/navigation/hooks';
import {
  getCasesConfigurePath,
  getCreateCasePath,
  getCaseViewPath,
  getCaseViewWithCommentPath,
  getSubCaseViewPath,
  getSubCaseViewWithCommentPath,
} from '../../common/navigation';

const CasesRoutesComponent: React.FC<CasesRoutesProps> = ({ path, ...props }) => {
  const { timelineIntegration } = props;
  const { userCanCrud } = useCasesContext();
  const { navigateToAllCases } = useAllCasesNavigation();
  const { navigateToCaseView } = useCaseViewNavigation();

  const onCreateCaseSuccess = useCallback(
    async ({ id }) => navigateToCaseView({ detailName: id }),
    [navigateToCaseView]
  );

  return (
    <Switch>
      <Route strict exact path={path}>
        <AllCases {...props} />
      </Route>

      {/* Using individual "userCanCrud" conditionals since Switch do not work with Fragment wrapped Routes */}
      {userCanCrud && (
        <Route path={getCreateCasePath(path)}>
          <CreateCase
            onSuccess={onCreateCaseSuccess}
            onCancel={navigateToAllCases}
            timelineIntegration={timelineIntegration}
          />
        </Route>
      )}

      {userCanCrud && (
        <Route path={getCasesConfigurePath(path)}>
          <ConfigureCase />
        </Route>
      )}

      {userCanCrud && (
        <Route
          exact
          path={[
            getSubCaseViewWithCommentPath(path),
            getCaseViewWithCommentPath(path),
            getSubCaseViewPath(path),
            getCaseViewPath(path),
          ]}
        >
          <CaseView {...props} />
        </Route>
      )}

      <Route path={path}>
        <Redirect to={path} />
      </Route>
    </Switch>
  );
};

export const CasesRoutes = React.memo(CasesRoutesComponent);

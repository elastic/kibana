/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import * as i18n from './translations';
import { CaseDetailsPage } from './case_details';
import { CasesPage } from './case';
import { CreateCasePage } from './create_case';
import { ConfigureCasesPage } from './configure_cases';
import { useKibana } from '../../common/lib/kibana';
import {
  getCasesConfigurePath,
  getCasesCreatePath,
  getCasesDetailPath,
  getCasesDetailWithCommentPath,
  getCasesPath,
  getCasesSubCaseDetailPath,
  getCasesSubCaseDetailWithCommentPath,
} from './paths';

export interface UserPermissions {
  crud: boolean;
  read: boolean;
}
export interface CasesRoutesProps {
  basePath?: string;
  userPermissions: UserPermissions;
}

const CasesRoutesComponent: React.FC<CasesRoutesProps> = (props) => {
  const { basePath, userPermissions } = props;
  const chrome = useKibana().services.chrome;

  useEffect(() => {
    // if the user is read only then display the glasses badge in the global navigation header
    if (userPermissions != null && !userPermissions.crud && userPermissions.read) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }

    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [userPermissions, chrome]);

  return (
    <Switch>
      {userPermissions.crud && (
        <>
          <Route path={getCasesCreatePath(basePath)}>
            <CreateCasePage {...props} />
          </Route>
          <Route path={getCasesConfigurePath(basePath)}>
            <ConfigureCasesPage {...props} />
          </Route>
          <Route exact path={getCasesSubCaseDetailWithCommentPath(basePath)}>
            <CaseDetailsPage {...props} />
          </Route>
          <Route exact path={getCasesDetailWithCommentPath(basePath)}>
            <CaseDetailsPage {...props} />
          </Route>
          <Route exact path={getCasesSubCaseDetailPath(basePath)}>
            <CaseDetailsPage {...props} />
          </Route>
          <Route path={getCasesDetailPath(basePath)}>
            <CaseDetailsPage {...props} />
          </Route>
        </>
      )}
      {userPermissions.read && (
        <Route strict exact path={getCasesPath(basePath)}>
          <CasesPage {...props} />
        </Route>
      )}
    </Switch>
  );
};

export const CasesRoutes = React.memo(CasesRoutesComponent);

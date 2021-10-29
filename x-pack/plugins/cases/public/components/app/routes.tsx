/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { useNavigation } from '../../common/lib/kibana';
import { AllCases, AllCasesProps } from '../all_cases';

import { CaseView, CaseViewProps } from '../case_view';
import { CreateCase, CreateCaseProps } from '../create';
import { ConfigureCase, ConfigureCaseProps } from '../configure_cases';
import {
  casesDeepLinkIds,
  getCasesConfigurePath,
  getCasesCreatePath,
  getCasesDetailPath,
  getCasesDetailWithCommentPath,
  getCasesSubCaseDetailPath,
  getCasesSubCaseDetailWithCommentPath,
} from '../../common/navigation';
import { CasesRoutesProps } from './types';

const CasesRoutesComponent: React.FC<CasesRoutesProps> = ({ path, appId, ...props }) => {
  const { userCanCrud } = props;
  const { getAppUrl, navigateTo } = useNavigation(appId);

  const viewProps = useMemo(
    (): Omit<CaseViewProps, 'caseId' | 'subCaseId'> => ({
      ...props,
      allCasesNavigation: {
        href: getAppUrl({
          deepLinkId: casesDeepLinkIds.cases,
        }),
        onClick: async (e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.cases,
          });
        },
      },
      caseDetailsNavigation: {
        href: getAppUrl({
          deepLinkId: casesDeepLinkIds.cases,
        }),
        onClick: async (e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.cases,
          });
        },
      },
      configureCasesNavigation: {
        href: getAppUrl({
          deepLinkId: casesDeepLinkIds.casesConfigure,
        }),
        onClick: async (e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.casesConfigure,
          });
        },
      },
      getCaseDetailHrefWithCommentId: (commentId: string) => '',
    }),
    [props, getAppUrl, navigateTo]
  );

  const allCasesProps = useMemo(
    (): AllCasesProps => ({
      ...props,
      createCaseNavigation: {
        href: getAppUrl({
          deepLinkId: casesDeepLinkIds.casesCreate,
        }),
        onClick: async (e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.casesCreate,
          });
        },
      },
      caseDetailsNavigation: {
        href: ({ detailName, subCaseId }) =>
          getAppUrl({
            deepLinkId: casesDeepLinkIds.cases,
            path: `/${detailName}${subCaseId ? `/sub-cases/${subCaseId}` : ''}`,
          }),
        onClick: async ({ detailName, subCaseId }, e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.cases,
            path: `/${detailName}${subCaseId ? `/sub-cases/${subCaseId}` : ''}`,
          });
        },
      },
      configureCasesNavigation: {
        href: getAppUrl({
          deepLinkId: casesDeepLinkIds.casesConfigure,
        }),
        onClick: async (e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.casesConfigure,
          });
        },
      },
    }),
    [props, getAppUrl, navigateTo]
  );

  const createCaseProps = useMemo(
    (): CreateCaseProps => ({
      onCancel: async () =>
        navigateTo({
          deepLinkId: casesDeepLinkIds.cases,
        }),
      onSuccess: async ({ id }) =>
        navigateTo({
          deepLinkId: casesDeepLinkIds.cases,
          path: `/${id}`,
        }),
      timelineIntegration: props.timelineIntegration,
    }),
    [props, navigateTo]
  );

  const configureCaseProps = useMemo(
    (): ConfigureCaseProps => ({
      userCanCrud: props.userCanCrud,
      allCasesNavigation: {
        href: getAppUrl({
          deepLinkId: casesDeepLinkIds.cases,
        }),
        onClick: async (e) => {
          if (e) {
            e.preventDefault();
          }
          navigateTo({
            deepLinkId: casesDeepLinkIds.cases,
          });
        },
      },
    }),
    [props.userCanCrud, getAppUrl, navigateTo]
  );

  return (
    <Switch>
      <Route strict exact path={path}>
        <AllCases {...allCasesProps} />
      </Route>

      {/* Using individual conditionals since Switch don't work well with Fragment wrapped Routes */}
      {userCanCrud && (
        <Route path={getCasesCreatePath(path)}>
          <CreateCase {...createCaseProps} />
        </Route>
      )}
      {userCanCrud && (
        <Route path={getCasesConfigurePath(path)}>
          <ConfigureCase {...configureCaseProps} />
        </Route>
      )}
      {userCanCrud && (
        <Route
          exact
          path={[
            getCasesSubCaseDetailWithCommentPath(path),
            getCasesDetailWithCommentPath(path),
            getCasesSubCaseDetailPath(path),
            getCasesDetailPath(path),
          ]}
        >
          <CaseView {...viewProps} />
        </Route>
      )}

      <Route path={path}>
        <Redirect to={path} />
      </Route>
    </Switch>
  );
};

export const CasesRoutes = React.memo(CasesRoutesComponent);

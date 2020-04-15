/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';

import { FormattedMessage } from '@kbn/i18n/react';

import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import { API_BASE_PATH } from '../../common/constants';

import { SectionError } from './components';
import { CLIENT_BASE_PATH, SECTION_SLUG } from './constants';
import { AuthorizationContext, AuthorizationProvider } from './lib/authorization';
import { AppDependencies } from './app_dependencies';

import { CloneTransformSection } from './sections/clone_transform';
import { CreateTransformSection } from './sections/create_transform';
import { TransformManagementSection } from './sections/transform_management';

export const App: FC = () => {
  const { apiError } = useContext(AuthorizationContext);
  if (apiError !== null) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.transform.app.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server."
          />
        }
        error={apiError}
      />
    );
  }

  return (
    <div data-test-subj="transformApp">
      <HashRouter>
        <Switch>
          <Route
            path={`${CLIENT_BASE_PATH}${SECTION_SLUG.CLONE_TRANSFORM}/:transformId`}
            component={CloneTransformSection}
          />
          <Route
            path={`${CLIENT_BASE_PATH}${SECTION_SLUG.CREATE_TRANSFORM}/:savedObjectId`}
            component={CreateTransformSection}
          />
          <Route
            exact
            path={CLIENT_BASE_PATH + SECTION_SLUG.HOME}
            component={TransformManagementSection}
          />
          <Redirect from={CLIENT_BASE_PATH} to={CLIENT_BASE_PATH + SECTION_SLUG.HOME} />
        </Switch>
      </HashRouter>
    </div>
  );
};

export const renderApp = (element: HTMLElement, appDependencies: AppDependencies) => {
  const I18nContext = appDependencies.i18n.Context;

  render(
    <KibanaContextProvider services={appDependencies}>
      <AuthorizationProvider privilegesEndpoint={`${API_BASE_PATH}privileges`}>
        <I18nContext>
          <App />
        </I18nContext>
      </AuthorizationProvider>
    </KibanaContextProvider>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};

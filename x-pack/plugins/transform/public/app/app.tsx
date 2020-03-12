/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';

import { FormattedMessage } from '@kbn/i18n/react';

import { SectionError } from './components';
import { CLIENT_BASE_PATH, SECTION_SLUG } from './constants';
import { getAppProviders } from './app_dependencies';
import { AuthorizationContext } from './lib/authorization';
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
  const Providers = getAppProviders(appDependencies);

  render(
    <Providers>
      <App />
    </Providers>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};

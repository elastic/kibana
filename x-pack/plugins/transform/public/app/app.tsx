/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, FC } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import { ScopedHistory } from 'kibana/public';

import { EuiErrorBoundary, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import { API_BASE_PATH } from '../../common/constants';

import { SectionError } from './components';
import { SECTION_SLUG } from './constants';
import { AuthorizationContext, AuthorizationProvider } from './lib/authorization';
import { AppDependencies } from './app_dependencies';

import { CloneTransformSection } from './sections/clone_transform';
import { CreateTransformSection } from './sections/create_transform';
import { TransformManagementSection } from './sections/transform_management';

export const App: FC<{ history: ScopedHistory }> = ({ history }) => {
  const { apiError } = useContext(AuthorizationContext);
  if (apiError !== null) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.transform.app.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server"
          />
        }
        error={apiError}
      />
    );
  }

  // min-width: 0 is needed to ensure the source index and preview data grids do not
  // overflow into the management page side nav when the page width is reduced
  // see https://github.com/elastic/eui/issues/4941
  return (
    <EuiFlexGroup justifyContent="spaceAround" data-test-subj="transformApp">
      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
        <Router history={history}>
          <Switch>
            <Route
              path={`/${SECTION_SLUG.CLONE_TRANSFORM}/:transformId`}
              component={CloneTransformSection}
            />
            <Route
              path={`/${SECTION_SLUG.CREATE_TRANSFORM}/:savedObjectId`}
              component={CreateTransformSection}
            />
            <Route path={`/`} component={TransformManagementSection} />
          </Switch>
        </Router>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const renderApp = (element: HTMLElement, appDependencies: AppDependencies) => {
  const I18nContext = appDependencies.i18n.Context;

  render(
    <EuiErrorBoundary>
      <KibanaContextProvider services={appDependencies}>
        <AuthorizationProvider privilegesEndpoint={`${API_BASE_PATH}privileges`}>
          <I18nContext>
            <App history={appDependencies.history} />
          </I18nContext>
        </AuthorizationProvider>
      </KibanaContextProvider>
    </EuiErrorBoundary>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};

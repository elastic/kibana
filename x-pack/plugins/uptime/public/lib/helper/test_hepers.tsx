/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { ChromeBreadcrumb } from 'kibana/public';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

const mockCore: () => [() => ChromeBreadcrumb[], any] = () => {
  let breadcrumbObj: ChromeBreadcrumb[] = [];
  const get = () => {
    return breadcrumbObj;
  };
  const core = {
    application: {
      getUrlForApp: () => '/app/uptime',
      navigateToUrl: jest.fn(),
    },
    chrome: {
      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbObj = newBreadcrumbs;
      },
    },
  };

  return [get, core];
};

/* Higher Order Components */
export function withKibanaContext<T>(WrappedComponent, kibanaProps, i18nProps) {
  const [getBreadcrumbs, core] = mockCore();
  return (props: T) => (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <I18nProvider {...i18nProps}>
        <WrappedComponent {...(props as T)} />
      </I18nProvider>
    </KibanaContextProvider>
  );
}

export function withRouter<T>(WrappedComponent, customHistory) {
  const history = customHistory || createMemoryHistory();
  return (props: T) => (
    <Router history={history}>
      <WrappedComponent {...(props as T)} />
    </Router>
  );
}

/* Mock Providers */
export function MockKibanaProvider({ children, kibanaProps, i18nProps }) {
  const [getBreadcrumbs, core] = mockCore();
  return (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <I18nProvider {...i18nProps}>{children}</I18nProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter({ children, customHistory, kibanaProps, i18nProps }) {
  const history = customHistory || createMemoryHistory();
  return (
    <Router history={history}>
      <MockKibanaProvider kibanaProps={kibanaProps} i18nProps={i18nProps}>
        {children}
      </MockKibanaProvider>
    </Router>
  );
}

/* React testing library custom renders */
const renderWithKibana = (ui, { kibanaProps, i18nProps } = {}) => {
  return render(
    <MockKibanaProvider {...kibanaProps} {...i18nProps}>
      {ui}
    </MockKibanaProvider>,
    renderOptions
  );
};

export const renderWithRouter = (
  ui,
  { customHistory, i18nProps, kibanaProps, renderOptions } = {}
) => {
  return render(
    <MockRouter customHistory={customHistory} kibanaProps={kibanaProps} i18nProps={i18nProps}>
      {ui}
    </MockRouter>,
    renderOptions
  );
};

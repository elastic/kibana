/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderApp } from './';
import { Observable } from 'rxjs';
import { CoreStart, AppMountParameters } from 'src/core/public';

describe('renderApp', () => {
  it('renders', () => {
    const core = ({
      application: { currentAppId$: new Observable(), navigateToUrl: () => {} },
      chrome: { docTitle: { change: () => {} }, setBreadcrumbs: () => {} },
      i18n: { Context: ({ children }: { children: React.ReactNode }) => children },
      uiSettings: { get: () => false },
    } as unknown) as CoreStart;
    const params = ({
      element: window.document.createElement('div'),
    } as unknown) as AppMountParameters;

    expect(() => {
      const unmount = renderApp(core, params);
      unmount();
    }).not.toThrowError();
  });
});

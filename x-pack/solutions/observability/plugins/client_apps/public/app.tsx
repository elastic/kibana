/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router, Route } from '@kbn/shared-ux-router';
import { RetraceView } from './platforms/android/retrace_view';

export function renderApp(core: CoreStart, { element, history }: AppMountParameters) {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <Router history={history}>
        <Route path="/android/retrace" render={() => <RetraceView core={core} />} />
      </Router>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}

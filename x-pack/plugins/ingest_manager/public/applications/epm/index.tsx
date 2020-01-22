/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from 'kibana/public';

export function renderApp(coreStart: CoreStart, { element }: AppMountParameters) {
  // coreStart.http.get('/api/endpoint/hello-world');
  // const store = appStoreFactory(coreStart);

  ReactDOM.render(<div>hello world - epm app</div>, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

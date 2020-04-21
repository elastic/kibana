/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'kibana/public';
import { createStore as createReduxStore } from 'redux';
import { Provider } from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';

const renderApp = (params, store) => {
  const { element } = params;
  ReactDOM.render(
    <Provider store={store}>
      <div>This is kibana 2</div>
    </Provider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

class MyPlugin {
  setup(core) {
    core.application.register({
      id: 'canvas2',
      title: 'Canvas App too',
      async mount(context, params) {
        const reducer = state => state;
        const store = createReduxStore(reducer, {});

        return renderApp(params, store);
      },
    });
  }

  start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) => new MyPlugin();

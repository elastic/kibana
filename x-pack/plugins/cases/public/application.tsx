/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { RenderAppProps } from './types';

export const renderApp = (deps: RenderAppProps) => {
  const { mountParams } = deps;
  const { element } = mountParams;

  ReactDOM.render(<App deps={deps} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

export const App: React.FC<{ deps: RenderAppProps }> = (deps) => {
  return <>{'Test'}</>;
};

App.displayName = 'App';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AppDependencies, RootComponent } from './app';

interface BootDependencies extends AppDependencies {
  element: HTMLElement;
}

export const renderApp = (deps: BootDependencies) => {
  const { element, ...appDependencies } = deps;
  render(<RootComponent {...appDependencies} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

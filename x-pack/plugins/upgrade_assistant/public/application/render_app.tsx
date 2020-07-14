/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ChromeDocTitle } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';

import { PLUGIN } from '../../common/constants';

import { AppDependencies, RootComponent } from './app';

interface BootDependencies extends AppDependencies {
  element: HTMLElement;
  docTitle: ChromeDocTitle;
}

export const renderApp = (deps: BootDependencies) => {
  const { element, docTitle, ...appDependencies } = deps;
  docTitle.change(PLUGIN.title);
  render(<RootComponent {...appDependencies} />, element);
  return () => {
    docTitle.reset();
    unmountComponentAtNode(element);
  };
};

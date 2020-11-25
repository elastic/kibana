/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { App, AppDeps } from './app';
import { setSavedObjectsClient } from '../common/lib/data_apis';

interface BootDeps extends AppDeps {
  element: HTMLElement;
  I18nContext: any;
}

export const boot = (bootDeps: BootDeps) => {
  const { I18nContext, element, ...appDeps } = bootDeps;

  if (appDeps.savedObjects) {
    setSavedObjectsClient(appDeps.savedObjects.client);
  }

  render(
    <I18nContext>
      <App {...appDeps} />
    </I18nContext>,
    element
  );
  return () => {
    unmountComponentAtNode(element);
  };
};

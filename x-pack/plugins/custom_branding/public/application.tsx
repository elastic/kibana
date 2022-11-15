/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { CustomBrandingApp } from './components/app';

export const renderApp = (
  { notifications, http }: CoreStart,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <CustomBrandingApp basename={appBasePath} notifications={notifications} http={http} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { LicenseStatus } from '../../common';
import { EcsMapperMainUi } from './components/main';

interface AppDependencies {
  el: HTMLElement;
  I18nContext: any;
  initialLicenseStatus: LicenseStatus;
}

export const renderApp = ({ el, I18nContext }: AppDependencies) => {
  render(
    <I18nContext>
      <EcsMapperMainUi/>
    </I18nContext>,
    el
  );

  return () => unmountComponentAtNode(el);
};

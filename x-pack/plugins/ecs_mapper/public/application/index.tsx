/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HttpStart as Http, ToastsSetup } from 'kibana/public';

import { LicenseStatus } from '../../common';

interface AppDependencies {
  el: HTMLElement;
  http: Http;
  I18nContext: any;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
}

export const renderApp = ({ el, I18nContext }: AppDependencies) => {
  render(<I18nContext>Placeholder for ECS Mapper</I18nContext>, el);

  return () => unmountComponentAtNode(el);
};

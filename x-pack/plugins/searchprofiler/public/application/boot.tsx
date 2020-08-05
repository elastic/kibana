/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render, unmountComponentAtNode } from 'react-dom';
import { HttpStart as Http, ToastsSetup } from 'kibana/public';
import React from 'react';

import { LicenseStatus } from '../../common';
import { App } from '.';

export interface Dependencies {
  el: HTMLElement;
  http: Http;
  I18nContext: any;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
}

export type AppDependencies = Omit<Dependencies, 'el'>;

export function boot(deps: Dependencies): () => void {
  const { el, ...rest } = deps;
  render(<App {...rest} />, deps.el);
  return () => unmountComponentAtNode(deps.el);
}

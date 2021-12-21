/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CspApp } from './app';

import type { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import type { CspStart } from '../types';

export const renderApp = (core: CoreStart, deps: CspStart, params: AppMountParameters) => {
  ReactDOM.render(<CspApp core={core} params={params} deps={deps} />, params.element);

  return () => ReactDOM.unmountComponentAtNode(params.element);
};

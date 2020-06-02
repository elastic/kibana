/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AppMountParameters } from '../../../../../src/core/public';
import { StartServices } from '../types';
import { SiemApp } from './app';
import { SecuritySubPlugins } from './types';

export const renderApp = (
  services: StartServices,
  { element }: AppMountParameters,
  subPlugins: SecuritySubPlugins
) => {
  render(<SiemApp services={services} subPlugins={subPlugins} />, element);
  return () => unmountComponentAtNode(element);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { AppMountParameters } from '../../../../../src/core/public';
import { StartServices } from '../plugin';
import { SiemApp } from './app';

export const renderApp = (services: StartServices, { element }: AppMountParameters) => {
  render(<SiemApp services={services} />, element);
  return () => unmountComponentAtNode(element);
};

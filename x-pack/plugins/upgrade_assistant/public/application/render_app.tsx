/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { RootComponent } from './app';
import { AppDependencies } from '../types';

export const renderApp = (element: HTMLElement, dependencies: AppDependencies) => {
  render(<RootComponent {...dependencies} />, element);

  return () => {
    unmountComponentAtNode(element);
  };
};

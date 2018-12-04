/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { HomeApp } from './home_app';

export const routes = [
  {
    name: 'home',
    path: '/',
    action: () => () => {
      chrome.breadcrumbs.set([
        {
          text: 'Canvas',
        },
      ]);
    },
    meta: {
      component: HomeApp,
    },
  },
];

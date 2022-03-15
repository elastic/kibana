/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { action } from '@storybook/addon-actions';

import type { ApplicationStart } from 'kibana/public';

const applications = new Map();

export const getApplication = () => {
  const application: ApplicationStart = {
    currentAppId$: of('fleet'),
    navigateToUrl: async (url: string) => {
      action(`Navigate to: ${url}`);
    },
    navigateToApp: async (app: string) => {
      action(`Navigate to: ${app}`);
    },
    getUrlForApp: (url: string) => url,
    capabilities: {
      catalogue: {},
      management: {},
      navLinks: {},
      fleet: {
        read: true,
        all: true,
      },
      fleetv2: {
        read: true,
        all: true,
      },
    },
    applications$: of(applications),
  };

  return application;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SlosPage } from '../pages/slos/slos';
import { SlosWelcomePage } from '../pages/slos_welcome/slos_welcome';
import { SloDetailsPage } from '../pages/slo_details/slo_details';
import { SloEditPage } from '../pages/slo_edit/slo_edit';
import {
  SLOS_OUTDATED_DEFINITIONS_PATH,
  SLOS_PATH,
  SLOS_WELCOME_PATH,
  SLO_CREATE_PATH,
  SLO_DETAIL_PATH,
  SLO_EDIT_PATH,
  SLO_SETTINGS_PATH,
} from '../../common/locators/paths';
import { SlosOutdatedDefinitions } from '../pages/slo_outdated_definitions';
import { SloSettingsPage } from '../pages/slo_settings/slo_settings';

export const getRoutes = (
  isServerless?: boolean
): {
  [key: string]: {
    handler: () => React.ReactElement;
    params: Record<string, string>;
    exact: boolean;
  };
} => {
  return {
    [SLOS_PATH]: {
      handler: () => {
        return <SlosPage />;
      },
      params: {},
      exact: true,
    },
    [SLO_CREATE_PATH]: {
      handler: () => {
        return <SloEditPage />;
      },
      params: {},
      exact: true,
    },
    [SLOS_WELCOME_PATH]: {
      handler: () => {
        return <SlosWelcomePage />;
      },
      params: {},
      exact: true,
    },
    [SLOS_OUTDATED_DEFINITIONS_PATH]: {
      handler: () => {
        return <SlosOutdatedDefinitions />;
      },
      params: {},
      exact: true,
    },
    [SLO_EDIT_PATH]: {
      handler: () => {
        return <SloEditPage />;
      },
      params: {},
      exact: true,
    },
    ...(!isServerless
      ? {
          [SLO_SETTINGS_PATH]: {
            handler: () => {
              return <SloSettingsPage />;
            },
            params: {},
            exact: true,
          },
        }
      : {}),
    [SLO_DETAIL_PATH]: {
      handler: () => {
        return <SloDetailsPage />;
      },
      params: {},
      exact: true,
    },
  };
};

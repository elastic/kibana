/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
// import { useKibana } from '../utils/kibana_react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SlosPage } from '../pages/slos/slos';
// import { SlosWelcomePage } from '../pages/slos_welcome/slos_welcome';
// import { SloDetailsPage } from '../pages/slo_details/slo_details';
// import { SloEditPage } from '../pages/slo_edit/slo_edit';
// import { SlosOutdatedDefinitions } from '../pages/slo_outdated_definitions';

import {
  SLOS_OUTDATED_DEFINITIONS_PATH,
  SLOS_PATH,
  SLOS_WELCOME_PATH,
  SLO_CREATE_PATH,
  SLO_DETAIL_PATH,
  SLO_EDIT_PATH,
} from '../../common/locators/paths';

// Note: React Router DOM <Redirect> component was not working here
// so I've recreated this simple version for this purpose.
// function SimpleRedirect({ to, redirectToApp }: { to: string; redirectToApp?: string }) {
//   const {
//     application: { navigateToApp },
//   } = useKibana().services;
//   const history = useHistory();
//   const { search, hash } = useLocation();

//   if (redirectToApp) {
//     navigateToApp(redirectToApp, { path: `/${search}${hash}`, replace: true });
//   } else if (to) {
//     history.replace(to);
//   }
//   return null;
// }

export const routes = {
  //   [ROOT_PATH]: {
  //     handler: () => {
  //       return <SimpleRedirect to={OVERVIEW_PATH} />;
  //     },
  //     params: {},
  //     exact: true,
  //   },
  [SLOS_PATH]: {
    handler: () => {
      console.log('SLos page');
      return <SlosPage />;
    },
    params: {},
    exact: true,
  },
  //   [SLO_CREATE_PATH]: {
  //     handler: () => {
  //       return <SloEditPage />;
  //     },
  //     params: {},
  //     exact: true,
  //   },
  //   [SLOS_WELCOME_PATH]: {
  //     handler: () => {
  //       return <SlosWelcomePage />;
  //     },
  //     params: {},
  //     exact: true,
  //   },
  //   [SLOS_OUTDATED_DEFINITIONS_PATH]: {
  //     handler: () => {
  //       return <SlosOutdatedDefinitions />;
  //     },
  //     params: {},
  //     exact: true,
  //   },
  //   [SLO_EDIT_PATH]: {
  //     handler: () => {
  //       return <SloEditPage />;
  //     },
  //     params: {},
  //     exact: true,
  //   },
  //   [SLO_DETAIL_PATH]: {
  //     handler: () => {
  //       return <SloDetailsPage />;
  //     },
  //     params: {},
  //     exact: true,
  //   },
};

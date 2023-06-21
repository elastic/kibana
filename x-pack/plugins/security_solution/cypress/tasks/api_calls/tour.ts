/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '@kbn/guided-onboarding-plugin/common';
import { siemGuideId } from '../../../common/guided_onboarding/siem_guide_config';

const alertsGuideActiveState = {
  isActive: true,
  status: 'in_progress',
  steps: [
    { id: 'add_data', status: 'complete' },
    { id: 'rules', status: 'complete' },
    { id: 'alertsCases', status: 'active' },
  ],
  guideId: siemGuideId,
};

export const startAlertsCasesTour = () =>
  cy.request({
    method: 'PUT',
    url: `${API_BASE_PATH}/state`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    body: {
      status: 'in_progress',
      guide: alertsGuideActiveState,
    },
  });

export const quitGlobalTour = () =>
  cy.request({
    method: 'PUT',
    url: `${API_BASE_PATH}/state`,
    headers: { 'kbn-xsrf': 'cypress-creds' },
    body: {
      status: 'quit',
      guide: {
        ...alertsGuideActiveState,
        isActive: false,
      },
    },
  });

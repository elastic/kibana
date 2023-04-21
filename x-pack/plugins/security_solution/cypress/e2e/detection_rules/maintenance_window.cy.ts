/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Maintenance window callout on Rule Management page', () => {
  let maintenanceWindowId = '';

  before(() => {
    cleanKibana();
    login();

    // Create a test maintenance window
    cy.request({
      method: 'POST',
      url: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window`,
      headers: { 'kbn-xsrf': 'cypress-creds' },
      body: {
        title: 'My maintenance window',
        duration: 10000,
        r_rule: {
          dtstart: new Date().toISOString(),
          tzid: 'Europe/Amsterdam',
          freq: 0,
          count: 1,
        },
      },
    }).then((response) => {
      maintenanceWindowId = response.body.id;
    });
  });

  after(() => {
    // Delete a test maintenance window
    cy.request({
      method: 'DELETE',
      url: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/${maintenanceWindowId}`,
      headers: { 'kbn-xsrf': 'cypress-creds' },
    });
  });

  it('Displays the callout when there are running maintenance windows', () => {
    visit(DETECTIONS_RULE_MANAGEMENT_URL);

    cy.contains('A maintenance window is currently running');
  });
});

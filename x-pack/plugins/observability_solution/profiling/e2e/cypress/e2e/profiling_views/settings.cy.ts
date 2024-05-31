/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';

describe('Settings page', () => {
  beforeEach(() => {
    cy.loginAsElastic();
  });

  afterEach(() => {
    cy.updateAdvancedSettings({
      [profilingCo2PerKWH]: 0.000379069,
      [profilingDatacenterPUE]: 1.7,
      [profilingPervCPUWattX86]: 7,
    });
  });

  it('opens setting page', () => {
    cy.visitKibana('/app/profiling/settings');
    cy.contains('Advanced Settings');
    cy.contains('CO2');
    cy.contains('Regional Carbon Intensity (ton/kWh)');
    cy.contains('Data Center PUE');
    cy.contains('Per vCPU Watts - x86');
    cy.contains('Per vCPU Watts - arm64');
    cy.contains('AWS EDP discount rate (%)');
    cy.contains('Cost per vCPU per hour ($)');
    cy.contains('Azure discount rate (%)');
    cy.contains('Show error frames in the Universal Profiling views');
  });

  it('updates values', () => {
    cy.visitKibana('/app/profiling/settings');
    cy.contains('Advanced Settings');
    cy.get('[data-test-subj="profilingBottomBarActions"]').should('not.exist');
    cy.get(`[data-test-subj="management-settings-editField-${profilingCo2PerKWH}"]`)
      .clear()
      .type('0.12345');
    cy.get(`[data-test-subj="management-settings-editField-${profilingDatacenterPUE}"]`)
      .clear()
      .type('2.4');
    cy.get(`[data-test-subj="management-settings-editField-${profilingPervCPUWattX86}"]`)
      .clear()
      .type('20');
    cy.get('[data-test-subj="profilingBottomBarActions"]').should('exist');
    cy.contains('Save changes').click();
    cy.get('[data-test-subj="profilingBottomBarActions"]').should('not.exist');
  });
});

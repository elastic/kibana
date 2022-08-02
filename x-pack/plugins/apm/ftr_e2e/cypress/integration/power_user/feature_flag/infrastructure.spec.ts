/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { synthtrace } from '../../../../synthtrace';
import { opbeans } from '../../../fixtures/synthtrace/opbeans';

const serviceOverviewPath = '/app/apm/services/opbeans-python/overview';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

describe('Infrastracture feature flag', () => {
  before(async () => {
    await synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(async () => {
    await synthtrace.clean();
  });

  describe('when infrastracture feature is enabled', () => {
    beforeEach(() => {
      cy.loginAsEditorUser().then(() => {
        // enables infrastructure view feature on advanced settings
        cy.updateAdvancedSettings({
          'observability:enableInfrastructureView': true,
        });
      });
    });

    it('shows infrastructure tab in service overview page', () => {
      cy.visit(serviceOverviewPath);
      cy.contains('a[role="tab"]', 'Infrastructure');
    });
  });

  describe('when infrastracture feature is disabled', () => {
    beforeEach(() => {
      cy.loginAsEditorUser().then(() => {
        // enables infrastructure view feature on advanced settings
        cy.updateAdvancedSettings({
          'observability:enableInfrastructureView': false,
        });
      });
    });

    it('hides infrastructure tab in service overview page', () => {
      cy.visit(serviceOverviewPath);
      cy.contains('a[role="tab"]', 'Infrastructure').should('not.exist');
    });
  });
});

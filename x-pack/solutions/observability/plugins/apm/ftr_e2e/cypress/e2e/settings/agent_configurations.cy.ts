/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import url from 'url';
import { synthtrace } from '../../../synthtrace';

const timeRange = {
  rangeFrom: '2021-10-10T00:00:00.000Z',
  rangeTo: '2021-10-10T00:15:00.000Z',
};

const agentConfigHref = url.format({
  pathname: '/app/apm/settings/agent-configuration',
});

function generateData({
  from,
  to,
  serviceName,
  agentName,
}: {
  from: number;
  to: number;
  serviceName: string;
  agentName: string;
}) {
  const range = timerange(from, to);

  const service = apm
    .service({
      name: serviceName,
      environment: 'production',
      agentName,
    })
    .instance('instance-1')
    .podId('pod-1');

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => [
      service
        .transaction({ transactionName: 'GET /apple 🍎 ' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ]);
}

describe('Agent configuration', () => {
  before(() => {
    const { rangeFrom, rangeTo } = timeRange;

    synthtrace.index([
      ...generateData({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
        serviceName: 'opbeans-node',
        agentName: 'nodejs',
      }),
      ...generateData({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
        serviceName: 'opbeans-java',
        agentName: 'nodejs',
      }),
      ...generateData({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
        serviceName: 'opbeans-java-edot',
        agentName: 'opentelemetry/java/elastic',
      }),
    ]);
  });

  after(() => {
    synthtrace.clean();
  });

  describe('when logged in as viewer user', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(agentConfigHref);
    });

    it('shows create button as disabled', () => {
      cy.contains('Create configuration').should('be.disabled');
    });
  });

  describe('when logged in as a viewer with write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmReadPrivilegesWithWriteSettingsUser();
      cy.visitKibana(agentConfigHref);
    });

    it('shows create button as enabled', () => {
      cy.contains('Create configuration').should('not.be.disabled');
    });
  });

  describe('when logged in as an editor without write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmAllPrivilegesWithoutWriteSettingsUser();
      cy.visitKibana(agentConfigHref);
    });

    it('shows create button as disabled', () => {
      cy.contains('Create configuration').should('be.disabled');
    });
  });

  describe('when logged in as editor user', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
      cy.visitKibana(agentConfigHref);
    });

    it('shows create button as enabled', () => {
      cy.contains('Create configuration').should('not.be.disabled');
    });

    it('persists service environment when clicking on edit button', () => {
      cy.intercept('GET', '/api/apm/settings/agent-configuration/environments?*').as(
        'serviceEnvironmentApi'
      );
      cy.contains('Create configuration').click();
      cy.getByTestSubj('serviceNameComboBox').find('input').click();
      cy.getByTestSubj('serviceNameComboBox').type('opbeans-node{enter}');
      cy.wait('@serviceEnvironmentApi');

      cy.getByTestSubj('serviceEnviromentComboBox').find('input').click();
      cy.getByTestSubj('comboBoxOptionsList serviceEnviromentComboBox-optionsList').should(
        'be.visible'
      );
      cy.getByTestSubj('comboBoxOptionsList serviceEnviromentComboBox-optionsList')
        .contains('button', 'production')
        .click();

      cy.contains('Next step').click();
      cy.contains('Create configuration');
      cy.contains('Edit').click();
      cy.wait('@serviceEnvironmentApi');
      cy.getByTestSubj('serviceEnviromentComboBox')
        .find('input')
        .invoke('val')
        .should('contain', 'production');
    });

    it('Should create an EDOT agent configuration', () => {
      cy.intercept('GET', '/api/apm/settings/agent-configuration/environments?*').as(
        'serviceEnvironmentApi'
      );
      cy.contains('Create configuration').click();
      cy.getByTestSubj('serviceNameComboBox').find('input').click();
      cy.getByTestSubj('serviceNameComboBox').type('opbeans-java-edot{enter}');
      cy.wait('@serviceEnvironmentApi');

      cy.getByTestSubj('serviceEnviromentComboBox').find('input').click();
      cy.getByTestSubj('comboBoxOptionsList serviceEnviromentComboBox-optionsList').should(
        'be.visible'
      );
      cy.getByTestSubj('comboBoxOptionsList serviceEnviromentComboBox-optionsList')
        .contains('button', 'production')
        .click();

      cy.contains('Next step').click();
      cy.contains('Create configuration');
      cy.contains('Deactivate instrumentations');
      cy.contains('Deactivate all instrumentations');
      cy.contains('Send traces');
      cy.contains('Send metrics');
      cy.contains('Send logs');
      cy.get('[data-test-subj="row_deactivate_all_instrumentations"')
        .find('[data-test-subj="apmSelectWithPlaceholderSelect"]')
        .select('true');
      cy.contains('Save configuration').click();
      cy.url().should('include', 'apm/settings/agent-configuration');
      cy.contains('Configurations');
      cy.contains('opbeans-java-edot');
      cy.get('[data-test-subj="apmColumnsButton"]').then((e) => {
        e[2].click();
      });
      cy.get('[data-test-subj="confirmModalConfirmButton"]').click();
      cy.contains('No configurations found');
    });

    it('displays All label when selecting all option', () => {
      cy.intercept('GET', '/api/apm/settings/agent-configuration/environments').as(
        'serviceEnvironmentApi'
      );
      cy.contains('Create configuration').click();
      cy.getByTestSubj('serviceNameComboBox').find('input').type('All{enter}');
      cy.getByTestSubj('serviceNameComboBox').find('input').click();
      cy.getByTestSubj('comboBoxOptionsList serviceNameComboBox-optionsList').should('be.visible');

      cy.getByTestSubj('comboBoxOptionsList serviceNameComboBox-optionsList')
        .contains('button', 'All')
        .click();
      cy.wait('@serviceEnvironmentApi');

      cy.getByTestSubj('serviceEnviromentComboBox').find('input').click();
      cy.getByTestSubj('comboBoxOptionsList serviceEnviromentComboBox-optionsList').should(
        'be.visible'
      );
      cy.getByTestSubj('comboBoxOptionsList serviceEnviromentComboBox-optionsList')
        .contains('button', 'All')
        .click();

      cy.contains('Next step').click();
      cy.get('[data-test-subj="settingsPage_serviceName"]').contains('All');
      cy.get('[data-test-subj="settingsPage_environmentName"]').contains('All');
      cy.contains('Edit').click();
      cy.wait('@serviceEnvironmentApi');
      cy.getByTestSubj('serviceEnviromentComboBox')
        .find('input')
        .invoke('val')
        .should('contain', 'All');
    });
  });
});

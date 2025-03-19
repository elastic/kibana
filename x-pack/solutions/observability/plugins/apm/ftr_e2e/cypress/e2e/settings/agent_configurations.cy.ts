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
}: {
  from: number;
  to: number;
  serviceName: string;
}) {
  const range = timerange(from, to);

  const service1 = apm
    .service({
      name: serviceName,
      environment: 'production',
      agentName: 'java',
    })
    .instance('service-1-prod-1')
    .podId('service-1-prod-1-pod');

  const service2 = apm
    .service({
      name: serviceName,
      environment: 'development',
      agentName: 'nodejs',
    })
    .instance('opbeans-node-prod-1');

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => [
      service1
        .transaction({ transactionName: 'GET /apple 🍎 ' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      service2
        .transaction({ transactionName: 'GET /banana 🍌' })
        .timestamp(timestamp)
        .duration(500)
        .success(),
    ]);
}

describe('Agent configuration', () => {
  before(() => {
    const { rangeFrom, rangeTo } = timeRange;

    synthtrace.index(
      generateData({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
        serviceName: 'opbeans-node',
      })
    );
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

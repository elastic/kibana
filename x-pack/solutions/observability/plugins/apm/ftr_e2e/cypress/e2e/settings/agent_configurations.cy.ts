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
      cy.getByTestSubj('row_deactivate_all_instrumentations')
        .find('[data-test-subj="apmSelectWithPlaceholderSelect"]')
        .select('true');
      cy.contains('Save configuration').click();
      cy.url().should('include', 'apm/settings/agent-configuration');
      cy.contains('Configurations');
      cy.contains('opbeans-java-edot');
      cy.get('[data-test-subj="apmColumnsButton"]').then((e) => {
        e[2].click();
      });
      cy.getByTestSubj('confirmModalConfirmButton').click();
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
      cy.getByTestSubj('settingsPage_serviceName').contains('All');
      cy.getByTestSubj('settingsPage_environmentName').contains('All');
      cy.contains('Edit').click();
      cy.wait('@serviceEnvironmentApi');
      cy.getByTestSubj('serviceEnviromentComboBox')
        .find('input')
        .invoke('val')
        .should('contain', 'All');
    });

    describe('Advanced Configuration Settings', () => {
      beforeEach(() => {
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
      });

      it('should display advanced configuration section', () => {
        cy.contains('Advanced Configuration').should('be.visible');
        cy.contains('Advanced configuration allows you to define custom settings').should(
          'be.visible'
        );
        cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').should('be.visible');
        cy.getByTestSubj('apmAdvancedConfigurationDocumentationLink').should('be.visible');
      });

      it('should add a new advanced configuration row when clicking add button', () => {
        cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').should('not.exist');
        cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').should('not.exist');

        cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();

        cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').should('be.visible');
        cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').should('be.visible');
        cy.getByTestSubj('apmSettingsRemoveAdvancedConfigurationButton').should('be.visible');
      });

      it('should remove advanced configuration row when clicking remove button', () => {
        cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();
        cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').should('have.length', 1);

        cy.getByTestSubj('apmSettingsRemoveAdvancedConfigurationButton').first().click();
        cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').should('have.length', 0);
      });

      describe('Key Input Validation', () => {
        beforeEach(() => {
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();
        });

        it('should show error when key is empty after interaction', () => {
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField')
            .first()
            .type('custom.key')
            .clear();
          cy.contains('Key cannot be empty').should('be.visible');
        });

        it('should show error when key is only whitespace', () => {
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(' ');
          cy.contains('Key cannot be only whitespace characters').should('be.visible');
        });

        it('should show error when key conflicts with predefined settings', () => {
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField')
            .first()
            .type('logging_level');

          cy.contains('This key is already predefined in the standard configuration above').should(
            'be.visible'
          );
        });

        it('should show error when duplicate keys are entered', () => {
          const duplicateKey = 'custom.setting.duplicate';
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(duplicateKey);

          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();

          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(duplicateKey);

          cy.contains('This key is already used in another advanced configuration').should(
            'be.visible'
          );
        });

        it('should accept valid custom keys', () => {
          const validKey = 'custom.my.setting';
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(validKey);

          cy.contains('Key cannot be empty').should('not.exist');
          cy.contains('This key is already predefined').should('not.exist');
          cy.contains('This key is already used').should('not.exist');
        });
      });

      describe('Value Input Validation', () => {
        beforeEach(() => {
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();
        });

        it('should show error when value is empty after interaction', () => {
          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField')
            .first()
            .type('custom.value')
            .clear();
          cy.contains('Value cannot be empty').should('be.visible');
        });

        it('should accept valid values', () => {
          const validValue = 'true';
          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').first().type(validValue);

          cy.contains('Value cannot be empty').should('not.exist');
        });
      });

      describe('Adding New Row Validation', () => {
        beforeEach(() => {
          // change predefined setting so action bar with save button is active
          cy.getByTestSubj('row_deactivate_all_instrumentations')
            .find('[data-test-subj="apmSelectWithPlaceholderSelect"]')
            .select('true');

          // trigger validation errors
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();
          cy.contains('Save configuration').click();

          cy.contains('Value cannot be empty').should('be.visible');
          cy.contains('Key cannot be empty').should('be.visible');
        });

        it('should show validation errors and remove them after providing valid values', () => {
          const customKey = 'custom.test.setting';
          const customValue = 'test-value';

          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(customKey);
          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').first().type(customValue);

          cy.contains('Value cannot be empty').should('not.exist');
          cy.contains('Key cannot be empty').should('not.exist');
        });

        it('should show validation errors and remove them after discarding changes', () => {
          // discard changes
          cy.getByTestSubj('apmBottomBarActionsDiscardChangesButton').click();

          // reopen new config row
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();

          cy.contains('Value cannot be empty').should('not.exist');
          cy.contains('Key cannot be empty').should('not.exist');
        });

        it('should show validation errors and remove them after deleting row', () => {
          // delete row
          cy.getByTestSubj('apmSettingsRemoveAdvancedConfigurationButton').click();

          // reopen new config row
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();

          cy.contains('Value cannot be empty').should('not.exist');
          cy.contains('Key cannot be empty').should('not.exist');
        });
      });

      describe('Complete Configuration Flow', () => {
        // delete congfiguration after test, otherwise unable to create new one
        afterEach(() => {
          cy.url().should('include', 'apm/settings/agent-configuration');
          cy.contains('Configurations');
          cy.contains('opbeans-java-edot');
          cy.get('[data-test-subj="apmColumnsButton"]').then((e) => {
            e[2].click();
          });
          cy.getByTestSubj('confirmModalConfirmButton').click();
          cy.contains('No configurations found');
        });

        it('should save configuration with advanced settings', () => {
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();

          const customKey = 'custom.test.setting';
          const customValue = 'test-value';

          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(customKey);

          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').first().type(customValue);

          cy.contains('Save configuration').click();

          cy.url().should('include', 'apm/settings/agent-configuration');
          cy.contains('Configurations').should('be.visible');
          cy.contains('opbeans-java-edot').should('be.visible');
        });

        it('should save configuration with multiple advanced settings', () => {
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField')
            .first()
            .type('custom.setting.one');
          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField')
            .first()
            .type('value-one')
            .type('value-one');

          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();
          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField')
            .first()
            .type('custom.setting.two');
          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').first().type('value-two');

          cy.contains('Save configuration').click();

          cy.url().should('include', 'apm/settings/agent-configuration');
          cy.contains('opbeans-java-edot').should('be.visible');
        });
      });

      describe('Documentation Link', () => {
        it('should have correct documentation link for Java agent', () => {
          cy.getByTestSubj('apmAdvancedConfigurationDocumentationLink')
            .should('have.attr', 'href')
            .and(
              'include',
              'https://www.elastic.co/docs/reference/opentelemetry/edot-sdks/java/configuration'
            );

          cy.getByTestSubj('apmAdvancedConfigurationDocumentationLink').should(
            'have.attr',
            'target',
            '_blank'
          );
        });
      });

      describe('Edge Cases and Error Handling', () => {
        it('should handle special characters in keys and values', () => {
          cy.getByTestSubj('apmSettingsAddAdvancedConfigurationButton').click();

          const specialKey = 'custom.key-with_special.chars123';
          const specialValue = 'value-with-special@chars#123!';

          cy.getByTestSubj('apmSettingsAdvancedConfigurationKeyField').first().type(specialKey);
          cy.getByTestSubj('apmSettingsAdvancedConfigurationValueField').first().type(specialValue);

          cy.contains('Key cannot be empty').should('not.exist');
          cy.contains('Value cannot be empty').should('not.exist');
        });
      });
    });
  });
});

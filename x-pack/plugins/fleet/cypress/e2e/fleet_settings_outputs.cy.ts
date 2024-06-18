/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESERVED_CONFIG_YML_KEYS } from '../../common/constants';

import {
  getSpecificSelectorId,
  SETTINGS_CONFIRM_MODAL_BTN,
  SETTINGS_OUTPUTS,
  SETTINGS_OUTPUTS_KAFKA,
  SETTINGS_SAVE_BTN,
} from '../screens/fleet';
import {
  cleanupOutput,
  fillInKafkaOutputForm,
  interceptOutputId,
  kafkaOutputBody,
  kafkaOutputFormValues,
  loadESOutput,
  loadKafkaOutput,
  loadLogstashOutput,
  loadRemoteESOutput,
  resetKafkaOutputForm,
  selectESOutput,
  selectKafkaOutput,
  selectRemoteESOutput,
  shouldDisplayError,
  validateOutputTypeChangeToKafka,
  validateSavedKafkaOutputForm,
} from '../screens/fleet_outputs';

import { login } from '../tasks/login';
import { visit } from '../tasks/common';

export const fillYamlConfigBox = (query: string) => {
  cy.get('[data-test-subj="kibanaCodeEditor"] textarea').type(query, { force: true });
};

export const clearYamlConfigBox = () => {
  cy.get('[data-test-subj="kibanaCodeEditor"] textarea').clear({ force: true });
};

describe('Outputs', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/fleet/agents/setup', {
      body: {
        isReady: true,
        is_secrets_storage_enabled: true,
        missing_requirements: [],
        missing_optional_features: [],
      },
    });

    login();
  });

  describe('Elasticsearch', () => {
    describe('Preset input', () => {
      afterEach(() => {
        clearYamlConfigBox();
        cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT).select('balanced');
      });

      it('is set to balanced by default', () => {
        selectESOutput();

        cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT).should('have.value', 'balanced');
      });

      for (const keyword of RESERVED_CONFIG_YML_KEYS) {
        it(`forces custom when reserved key ${keyword} is included in config YAML box`, () => {
          selectESOutput();

          fillYamlConfigBox(`${keyword}: value`);

          cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT)
            .should('have.value', 'custom')
            .should('be.disabled');
        });
      }

      it('handles expanded syntax for reserved keys', () => {
        selectESOutput();

        fillYamlConfigBox(`
queue:
  mem:
    flush:
      min_events: 100
          `);

        cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT)
          .should('have.value', 'custom')
          .should('be.disabled');
      });

      it('allows balanced when reserved key is not included in config yaml box', () => {
        selectESOutput();

        fillYamlConfigBox('some_random_key: foo');

        cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT)
          .should('have.value', 'balanced')
          .should('be.enabled');
      });

      const cases = [
        {
          name: 'Preset: Balanced',
          preset: 'balanced',
        },
        {
          name: 'Preset: Custom',
          preset: 'custom',
        },
        {
          name: 'Preset: Throughput',
          preset: 'throughput',
        },
        {
          name: 'Preset: Scale',
          preset: 'scale',
        },
        {
          name: 'Preset: Latency',
          preset: 'latency',
        },
      ];

      for (const type of ['elasticsearch', 'remote_elasticsearch']) {
        for (const testCase of cases) {
          describe(`When type is ${type} and preset is ${testCase.preset}`, () => {
            it('successfully creates output', () => {
              if (type === 'elasticsearch') {
                selectESOutput();
              } else if (type === 'remote_elasticsearch') {
                selectRemoteESOutput();
              }

              cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT).type(`${type} - ${testCase.name}`);
              cy.get(`[placeholder="Specify host URL"]`).type(
                `http://${testCase.preset}.elasticsearch.com:9200`
              );
              cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT).select(testCase.preset);

              if (type === 'remote_elasticsearch') {
                cy.getBySel('serviceTokenSecretInput').type('secret');
              }

              cy.intercept('POST', '**/api/fleet/outputs').as('saveOutput');
              cy.getBySel(SETTINGS_SAVE_BTN).click();

              cy.wait('@saveOutput').then((interception) => {
                const responseBody = interception.response?.body;
                cy.visit(`/app/fleet/settings/outputs/${responseBody?.item?.id}`);
              });

              cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT).should(
                'have.value',
                `${type} - ${testCase.name}`
              );
              cy.get(`[placeholder="Specify host URL"]`).should(
                'have.value',
                `http://${testCase.preset}.elasticsearch.com:9200`
              );
              cy.getBySel(SETTINGS_OUTPUTS.PRESET_INPUT).should('have.value', testCase.preset);
            });
          });
        }
      }
    });
  });

  describe('Remote ES', () => {
    it('displays proper error messages', () => {
      selectRemoteESOutput();
      cy.getBySel(SETTINGS_SAVE_BTN).click();

      cy.contains('Name is required');
      cy.contains('URL is required');
      cy.contains('Service Token is required');
      shouldDisplayError(SETTINGS_OUTPUTS.NAME_INPUT);
      shouldDisplayError('serviceTokenSecretInput');
    });

    describe('Form submit', () => {
      let outputId: string;

      before(() => {
        interceptOutputId((id) => {
          outputId = id;
        });
      });

      after(() => {
        cleanupOutput(outputId);
      });

      it('saves the output', () => {
        selectRemoteESOutput();

        cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT).type('name');
        cy.get('[placeholder="Specify host URL"').clear().type('https://localhost:5000');
        cy.getBySel('serviceTokenSecretInput').type('service_token');

        cy.intercept('POST', '**/api/fleet/outputs').as('saveOutput');

        cy.getBySel(SETTINGS_SAVE_BTN).click();

        cy.wait('@saveOutput').then((interception) => {
          const responseBody = interception.response?.body;
          cy.visit(`/app/fleet/settings/outputs/${responseBody?.item?.id}`);
          // There is no Fleet server, therefore the service token should have been saved in plain text.
          expect(responseBody?.item.service_token).to.equal('service_token');
          expect(responseBody?.item.secrets).to.equal(undefined);
        });

        cy.get('[placeholder="Specify host URL"').should('have.value', 'https://localhost:5000');
        cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT).should('have.value', 'name');
      });
    });

    describe('Form edit', () => {
      let outputId: string;

      before(() => {
        loadRemoteESOutput().then((data) => {
          outputId = data.item.id;
        });
      });
      after(() => {
        cleanupOutput(outputId);
      });

      it('edits the output', () => {
        visit(`/app/fleet/settings/outputs/${outputId}`);

        cy.get('[placeholder="Specify host URL"').clear().type('https://localhost:5001');

        cy.getBySel(SETTINGS_SAVE_BTN).click();
        cy.getBySel(SETTINGS_CONFIRM_MODAL_BTN).click();
        visit(`/app/fleet/settings/outputs/${outputId}`);

        cy.get('[placeholder="Specify host URL"').should('have.value', 'https://localhost:5001');
      });
    });
  });

  describe('Kafka', () => {
    describe('Form validation', () => {
      it('renders all form fields', () => {
        selectKafkaOutput();

        cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.VERSION_SELECT);
        cy.get('[placeholder="Specify host"');
        cy.getBySel(SETTINGS_OUTPUTS.ADD_HOST_ROW_BTN);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SELECT).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_NONE_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_PASSWORD_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SSL_OPTION);
        });

        // Verify user/pass fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT);
        cy.get('[placeholder="Specify certificate authority"]');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_VERIFICATION_MODE_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_SELECT).should(
          'not.exist'
        );

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SELECT).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_PLAIN_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_256_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_512_OPTION);
        });

        // Verify SSL fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SSL_OPTION).find('label').click();
        cy.get('[placeholder="Specify certificate authority"]');
        cy.get('[placeholder="Specify ssl certificate"]');
        cy.get('[placeholder="Specify certificate key"]');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_VERIFICATION_MODE_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_SELECT).should(
          'not.exist'
        );

        // Verify None fields

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_NONE_OPTION).find('label').click();

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SELECT).should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT).should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT).should('not.exist');
        cy.get('[placeholder="Specify ssl certificate"]').should('not.exist');
        cy.get('[placeholder="Specify certificate key"]').should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_VERIFICATION_MODE_INPUT).should(
          'not.exist'
        );
        cy.get('[placeholder="Specify certificate authority"]').should('not.exist');

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_SELECT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_PLAIN_OPTION);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_ENCRYPTION_OPTION);

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_ENCRYPTION_OPTION)
          .find('label')
          .click();

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_VERIFICATION_MODE_INPUT);
        cy.get('[placeholder="Specify certificate authority"]');

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_PASSWORD_OPTION)
          .find('label')
          .click();

        // Verify Partitioning fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_PANEL).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_SELECT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_RANDOM_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_ROUND_ROBIN_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_EVENTS_INPUT);
        });

        // Verify Round Robin fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_RANDOM_OPTION).find('label').click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_EVENTS_INPUT);

        // Verify Hash fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION).find('label').click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_RANDOM_OPTION).find('label').click();

        // Topics
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_PANEL).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_DEFAULT_TOPIC_INPUT);
        });

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_PANEL).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_KEY_INPUT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_VALUE_INPUT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_ADD_ROW_BUTTON).should('be.disabled');
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_REMOVE_ROW_BUTTON).should('be.disabled');
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_CLIENT_ID_INPUT).should(
            'have.value',
            'Elastic'
          );
        });

        // Verify add header
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_KEY_INPUT).type('key');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_VALUE_INPUT).type('value');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_ADD_ROW_BUTTON).should('be.enabled');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_REMOVE_ROW_BUTTON).should('be.disabled');

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_ADD_ROW_BUTTON).click();
        cy.getBySel(getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.HEADERS_KEY_INPUT, 1));
        cy.getBySel(getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.HEADERS_VALUE_INPUT, 1));
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_ADD_ROW_BUTTON).should('be.enabled');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_REMOVE_ROW_BUTTON).should('be.enabled');

        // Verify remove header
        cy.getBySel(
          getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.HEADERS_REMOVE_ROW_BUTTON, 1)
        ).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_ADD_ROW_BUTTON).should('be.enabled');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_REMOVE_ROW_BUTTON).should('be.disabled');

        // Compression
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_CODEC_INPUT).should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_SWITCH).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_LEVEL_INPUT).should('exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_LEVEL_INPUT).select('1');

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_PANEL).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_ACK_RELIABILITY_SELECT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_TIMEOUT_SELECT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_REACHABILITY_TIMEOUT_SELECT);
        });
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.KEY_INPUT);
      });

      it('displays proper error messages', () => {
        selectKafkaOutput();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_CLIENT_ID_INPUT).clear();
        cy.getBySel(SETTINGS_SAVE_BTN).click();

        cy.contains('Name is required');
        cy.contains('Host is required');
        cy.contains('Username is required');
        cy.contains('Password is required');
        cy.contains('Default topic is required');
        cy.contains(
          'Client ID is invalid. Only letters, numbers, dots, underscores, and dashes are allowed.'
        );
        shouldDisplayError(SETTINGS_OUTPUTS.NAME_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.TOPICS_DEFAULT_TOPIC_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.HEADERS_CLIENT_ID_INPUT);
      });
    });

    // Test buttons presence before accessing output directly via url and delete via api
    describe('Output operations', () => {
      let kafkaOutputId: string;

      before(() => {
        loadKafkaOutput().then((data) => {
          kafkaOutputId = data.item.id;
        });
      });

      it('opens edit modal', () => {
        visit('/app/fleet/settings');
        cy.get(`a[href="/app/fleet/settings/outputs/${kafkaOutputId}"]`)
          .parents('tr')
          .within(() => {
            cy.contains(kafkaOutputBody.name);
            cy.contains(kafkaOutputBody.type);
            cy.contains(kafkaOutputBody.hosts[0]);
            cy.getBySel('editOutputBtn').click();
            cy.url().should('include', `/app/fleet/settings/outputs/${kafkaOutputId}`);
          });
      });
      it('delete output', () => {
        visit('/app/fleet/settings');
        cy.get(`a[href="/app/fleet/settings/outputs/${kafkaOutputId}"]`)
          .parents('tr')
          .within(() => {
            cy.get('[title="Delete"]').click();
          });
        cy.getBySel(SETTINGS_CONFIRM_MODAL_BTN).click();
        cy.get(`a[href="app/fleet/settings/outputs/${kafkaOutputId}"]`).should('not.exist');
      });
    });

    describe('Form submit', () => {
      let kafkaOutputId: string;

      before(() => {
        interceptOutputId((id) => {
          kafkaOutputId = id;
        });
      });

      after(() => {
        cleanupOutput(kafkaOutputId);
      });

      it('saves the output', () => {
        selectKafkaOutput();

        fillInKafkaOutputForm(true);

        cy.intercept('POST', '**/api/fleet/outputs').as('saveOutput');

        cy.getBySel(SETTINGS_SAVE_BTN).click();

        cy.wait('@saveOutput').then((interception) => {
          const responseBody = interception.response?.body;
          cy.visit(`/app/fleet/settings/outputs/${responseBody?.item?.id}`);
        });

        validateSavedKafkaOutputForm();
      });
    });

    describe('Form edit', () => {
      let kafkaOutputId: string;

      before(() => {
        loadKafkaOutput().then((data) => {
          kafkaOutputId = data.item.id;
        });
      });
      after(() => {
        cleanupOutput(kafkaOutputId);
      });

      it('edits the output', () => {
        visit(`/app/fleet/settings/outputs/${kafkaOutputId}`);

        resetKafkaOutputForm();

        fillInKafkaOutputForm();

        cy.getBySel(SETTINGS_SAVE_BTN).click();
        cy.getBySel(SETTINGS_CONFIRM_MODAL_BTN).click();
        visit(`/app/fleet/settings/outputs/${kafkaOutputId}`);

        validateSavedKafkaOutputForm();
      });
    });

    describe('Form output type change', () => {
      let kafkaOutputToESId: string;
      let kafkaOutputToLogstashId: string;
      let logstashOutputToKafkaId: string;
      let esOutputToKafkaId: string;

      before(() => {
        loadKafkaOutput().then((data) => {
          kafkaOutputToESId = data.item.id;
        });
        loadKafkaOutput().then((data) => {
          kafkaOutputToLogstashId = data.item.id;
        });
        loadESOutput().then((data) => {
          esOutputToKafkaId = data.item.id;
        });
        loadLogstashOutput().then((data) => {
          logstashOutputToKafkaId = data.item.id;
        });
      });
      after(() => {
        cleanupOutput(kafkaOutputToESId);
        cleanupOutput(kafkaOutputToLogstashId);
        cleanupOutput(logstashOutputToKafkaId);
        cleanupOutput(esOutputToKafkaId);
      });
      it('changes output type from es to kafka', () => {
        validateOutputTypeChangeToKafka(esOutputToKafkaId);
      });

      it('changes output type from logstash to kafka', () => {
        validateOutputTypeChangeToKafka(logstashOutputToKafkaId);
      });

      it('changes output type from kafka to es', () => {
        visit(`/app/fleet/settings/outputs/${kafkaOutputToESId}`);
        cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).select('elasticsearch');
        cy.getBySel(kafkaOutputFormValues.name.selector).clear().type('kafka_to_es');
        cy.get('[placeholder="Specify host URL"').clear().type('https://localhost:5000');

        cy.intercept('PUT', '**/api/fleet/outputs/**').as('saveOutput');

        cy.getBySel(SETTINGS_SAVE_BTN).click();
        cy.getBySel(SETTINGS_CONFIRM_MODAL_BTN).click();

        // wait for the save request to finish to avoid race condition
        cy.wait('@saveOutput').then(() => {
          visit(`/app/fleet/settings/outputs/${kafkaOutputToESId}`);
        });

        cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).should('have.value', 'elasticsearch');
        cy.getBySel(kafkaOutputFormValues.name.selector).should('have.value', 'kafka_to_es');
      });

      it('changes output type from kafka to logstash', () => {
        visit(`/app/fleet/settings/outputs/${kafkaOutputToLogstashId}`);
        cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).select('logstash');
        cy.getBySel(kafkaOutputFormValues.name.selector).clear().type('kafka_to_logstash');
        cy.get('[placeholder="Specify host"').clear().type('localhost:5000');
        cy.get('[placeholder="Specify ssl certificate"]').clear().type('SSL CERTIFICATE');
        cy.get('[placeholder="Specify certificate key"]').clear().type('SSL KEY');

        cy.intercept('PUT', '**/api/fleet/outputs/**').as('saveOutput');

        cy.getBySel(SETTINGS_SAVE_BTN).click();
        cy.getBySel(SETTINGS_CONFIRM_MODAL_BTN).click();

        // wait for the save request to finish to avoid race condition
        cy.wait('@saveOutput').then(() => {
          visit(`/app/fleet/settings/outputs/${kafkaOutputToLogstashId}`);
        });

        cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).should('have.value', 'logstash');
        cy.getBySel(kafkaOutputFormValues.name.selector).should('have.value', 'kafka_to_logstash');
      });
    });
  });

  describe('Outputs List', () => {
    beforeEach(() => {
      cy.intercept('/api/fleet/outputs', {
        items: [
          {
            id: 'fleet-default-output',
            name: 'default',
            type: 'elasticsearch',
            is_default: true,
            is_default_monitoring: true,
          },
          {
            id: 'internal-fleet-output',
            name: 'internal output',
            type: 'elasticsearch',
            is_default: false,
            is_default_monitoring: false,
            is_internal: true,
          },
        ],
      });

      cy.visit('/app/fleet/settings');
    });

    it('should not display internal outputs', () => {
      cy.getBySel(SETTINGS_OUTPUTS.TABLE).should('not.contain', 'internal output');
    });
  });
});

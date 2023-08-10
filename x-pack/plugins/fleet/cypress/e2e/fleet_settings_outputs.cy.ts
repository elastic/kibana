/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  resetKafkaOutputForm,
  selectKafkaOutput,
  shouldDisplayError,
  validateOutputTypeChangeToKafka,
  validateSavedKafkaOutputForm,
} from '../screens/fleet_outputs';

import { login } from '../tasks/login';

import { visit } from '../tasks/common';

describe('Outputs', () => {
  beforeEach(() => {
    login();
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
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SSL_OPTION).click();
        cy.get('[placeholder="Specify certificate authority"]');
        cy.get('[placeholder="Specify ssl certificate"]');
        cy.get('[placeholder="Specify certificate key"]');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_VERIFICATION_MODE_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_SELECT).should(
          'not.exist'
        );

        // Verify None fields

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_NONE_OPTION).click();

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

        cy.getBySel(
          SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_CONNECTION_TYPE_ENCRYPTION_OPTION
        ).click();

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_VERIFICATION_MODE_INPUT);
        cy.get('[placeholder="Specify certificate authority"]');

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_PASSWORD_OPTION).click();

        // Verify Partitioning fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_PANEL).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_SELECT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_RANDOM_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_ROUND_ROBIN_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_EVENTS_INPUT);
        });

        // Verify Round Robin fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_RANDOM_OPTION).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_EVENTS_INPUT);

        // Verify Hash fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_RANDOM_OPTION).click();

        // Topics
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_PANEL).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_DEFAULT_TOPIC_INPUT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_ADD_ROW_BUTTON);
        });

        // Verify one topic processor fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_ADD_ROW_BUTTON).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_WHEN_INPUT);

        // Verify additional topic processor fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_ADD_ROW_BUTTON).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_WHEN_INPUT);
        cy.getBySel(getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT, 1));
        cy.getBySel(getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT, 1));
        cy.getBySel(getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.TOPICS_WHEN_INPUT, 1));
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_DRAG_HANDLE_ICON);

        // Verify remove topic processors
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_REMOVE_ROW_BUTTON).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_REMOVE_ROW_BUTTON).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT).should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT).should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_WHEN_INPUT).should('not.exist');

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
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_LEVEL_INPUT).should('not.exist');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_CODEC_INPUT).select('gzip');
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
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_ADD_ROW_BUTTON).click();
        cy.getBySel(SETTINGS_SAVE_BTN).click();

        cy.contains('Name is required');
        cy.contains('Host is required');
        cy.contains('Username is required');
        cy.contains('Password is required');
        cy.contains('Default topic is required');
        cy.contains('Topic is required');
        cy.contains(
          'Client ID is invalid. Only letters, numbers, dots, underscores, and dashes are allowed.'
        );
        cy.contains('Must be a key, value pair i.e. "http.response.code: 200"');
        shouldDisplayError(SETTINGS_OUTPUTS.NAME_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.TOPICS_DEFAULT_TOPIC_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT);
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

        fillInKafkaOutputForm();

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
});

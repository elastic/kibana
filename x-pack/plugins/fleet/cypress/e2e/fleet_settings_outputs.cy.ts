/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSpecificSelectorId,
  SETTINGS_OUTPUTS,
  SETTINGS_OUTPUTS_KAFKA,
  SETTINGS_SAVE_BTN,
} from '../screens/fleet';
import {
  cleanupKafkaOutput,
  interceptOutputId,
  kafkaOutputFormValues,
  selectKafkaOutput,
  shouldDisplayError,
} from '../screens/fleet_outputs';

import { login } from '../tasks/login';

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
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_PASSWORD_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SSL_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_KERBEROS_OPTION);
        });

        // Verify user/pass fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT);
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT);

        // Verify SSL fields
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SSL_OPTION).click();
        cy.get('[placeholder="Specify certificate authority"]');
        cy.get('[placeholder="Specify ssl certificate"]');
        cy.get('[placeholder="Specify certificate key"]');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_PASSWORD_OPTION).click();

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SELECT).within(() => {
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_PLAIN_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_256_OPTION);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_512_OPTION);
        });

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
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_CLIENT_ID_INPUT);
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
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_CHANNEL_BUFFER_SIZE_SELECT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_TIMEOUT_SELECT);
          cy.getBySel(SETTINGS_OUTPUTS_KAFKA.BROKER_REACHABILITY_TIMEOUT_SELECT);
        });
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.KEY_INPUT);
      });

      it('displays proper error messages', () => {
        selectKafkaOutput();
        cy.getBySel(SETTINGS_SAVE_BTN).click();

        cy.contains('Name is required');
        cy.contains('URL is required');
        cy.contains('Username is required');
        cy.contains('Password is required');
        cy.contains('Default topic is required');
        shouldDisplayError(SETTINGS_OUTPUTS.NAME_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT);
        shouldDisplayError(SETTINGS_OUTPUTS_KAFKA.TOPICS_DEFAULT_TOPIC_INPUT);
      });
    });

    describe('Form submission', () => {
      let outputId: string;

      before(() => {
        interceptOutputId((id) => {
          outputId = id;
        });
      });

      after(() => {
        cleanupKafkaOutput(outputId);
      });

      it('saves the output', () => {
        selectKafkaOutput();

        cy.getBySel(kafkaOutputFormValues.name.selector).type(kafkaOutputFormValues.name.value);
        cy.get('[placeholder="Specify host"').clear().type('http://localhost:5000');
        cy.getBySel(kafkaOutputFormValues.username.selector).type(
          kafkaOutputFormValues.username.value
        );
        cy.getBySel(kafkaOutputFormValues.password.selector).type(
          kafkaOutputFormValues.password.value
        );

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_256_OPTION).click();
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION).click();

        cy.getBySel(kafkaOutputFormValues.hash.selector).type(kafkaOutputFormValues.hash.value);
        cy.getBySel(kafkaOutputFormValues.defaultTopic.selector).type(
          kafkaOutputFormValues.defaultTopic.value
        );

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_ADD_ROW_BUTTON).click();

        cy.getBySel(kafkaOutputFormValues.firstTopic.selector).type(
          kafkaOutputFormValues.firstTopic.value
        );
        cy.getBySel(kafkaOutputFormValues.firstTopicCondition.selector).type(
          kafkaOutputFormValues.firstTopicCondition.value
        );
        cy.getBySel(kafkaOutputFormValues.firstTopicWhen.selector).select(
          kafkaOutputFormValues.firstTopicWhen.value
        );

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.TOPICS_ADD_ROW_BUTTON).click();

        cy.getBySel(kafkaOutputFormValues.secondTopic.selector).type(
          kafkaOutputFormValues.secondTopic.value
        );
        cy.getBySel(kafkaOutputFormValues.secondTopicCondition.selector).type(
          kafkaOutputFormValues.secondTopicCondition.value
        );
        cy.getBySel(kafkaOutputFormValues.secondTopicWhen.selector).select(
          kafkaOutputFormValues.secondTopicWhen.value
        );

        cy.getBySel(kafkaOutputFormValues.firstHeaderKey.selector).type(
          kafkaOutputFormValues.firstHeaderKey.value
        );
        cy.getBySel(kafkaOutputFormValues.firstHeaderValue.selector).type(
          kafkaOutputFormValues.firstHeaderValue.value
        );

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.HEADERS_ADD_ROW_BUTTON).click();

        cy.getBySel(kafkaOutputFormValues.secondHeaderKey.selector).type(
          kafkaOutputFormValues.secondHeaderKey.value
        );
        cy.getBySel(kafkaOutputFormValues.secondHeaderValue.selector).type(
          kafkaOutputFormValues.secondHeaderValue.value
        );

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_SWITCH).click();

        cy.getBySel(kafkaOutputFormValues.compressionCoded.selector).select(
          kafkaOutputFormValues.compressionCoded.value
        );
        cy.getBySel(kafkaOutputFormValues.compressionLevel.selector).select(
          kafkaOutputFormValues.compressionLevel.value
        );

        cy.getBySel(kafkaOutputFormValues.brokerAckReliability.selector).select(
          kafkaOutputFormValues.brokerAckReliability.value
        );
        cy.getBySel(kafkaOutputFormValues.brokerChannelBufferSize.selector).select(
          kafkaOutputFormValues.brokerChannelBufferSize.value
        );
        cy.getBySel(kafkaOutputFormValues.brokerTimeout.selector).select(
          kafkaOutputFormValues.brokerTimeout.value
        );
        cy.getBySel(kafkaOutputFormValues.brokerReachabilityTimeout.selector).select(
          kafkaOutputFormValues.brokerReachabilityTimeout.value
        );
        cy.getBySel(kafkaOutputFormValues.key.selector).type(kafkaOutputFormValues.key.value);

        cy.intercept('POST', '**/api/fleet/outputs').as('saveOutput');

        cy.getBySel(SETTINGS_SAVE_BTN).click();

        cy.wait('@saveOutput').then((interception) => {
          const responseBody = interception.response?.body;
          cy.visit(`/app/fleet/settings/outputs/${responseBody?.item?.id}`);
        });

        Object.keys(kafkaOutputFormValues).forEach((key: string) => {
          const { selector, value } =
            kafkaOutputFormValues[key as keyof typeof kafkaOutputFormValues];
          cy.getBySel(selector).should('have.value', value);
        });

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_256_OPTION)
          .find('input')
          .should('be.checked');
        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION)
          .find('input')
          .should('be.checked');

        cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_SWITCH).should(
          'have.attr',
          'aria-checked',
          'true'
        );
      });
    });
  });
});

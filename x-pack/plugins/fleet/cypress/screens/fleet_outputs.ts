/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from '@kbn/osquery-plugin/cypress/tasks/common';

import { visit } from '../tasks/common';

import {
  getSpecificSelectorId,
  SETTINGS_CONFIRM_MODAL_BTN,
  SETTINGS_OUTPUTS,
  SETTINGS_OUTPUTS_KAFKA,
  SETTINGS_SAVE_BTN,
} from './fleet';

export const selectKafkaOutput = () => {
  visit('/app/fleet/settings');
  cy.getBySel(SETTINGS_OUTPUTS.ADD_BTN).click();
  cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).select('kafka');
};

export const shouldDisplayError = (handler: string) => {
  cy.getBySel(handler).should('have.attr', 'aria-invalid', 'true');
};

export const interceptOutputId = (cb: (caseId: string) => void) => {
  cy.intercept('POST', '**/api/fleet/outputs', (req) => {
    req.continue((res) => {
      cb(res.body.item.id);
      return res.send(res.body);
    });
  });
};

export const cleanupOutput = (outputId: string) => {
  cy.request({
    method: 'DELETE',
    url: `/api/fleet/outputs/${outputId}`,
    headers: { 'kbn-xsrf': 'xx' },
  });
};

const loadOutput = (body: Record<string, unknown>) =>
  request<{ item: { id: string } }>({
    method: 'POST',
    body,
    url: `/api/fleet/outputs`,
    headers: { 'kbn-xsrf': 'xx' },
  }).then((response) => response.body);

export const kafkaOutputBody = {
  name: 'kafka_test1',
  type: 'kafka',
  is_default: false,
  hosts: ['https://example.com'],
  topics: [{ topic: 'test' }],
  auth_type: 'user_pass',
  username: 'kafka',
  password: 'kafka',
};

export const loadKafkaOutput = () => loadOutput(kafkaOutputBody);

export const loadESOutput = () =>
  loadOutput({
    name: 'es',
    type: 'elasticsearch',
    is_default: false,
    is_default_monitoring: false,
    hosts: ['https://bla.co'],
  });

export const loadLogstashOutput = () =>
  loadOutput({
    name: 'ls',
    type: 'logstash',
    is_default: false,
    is_default_monitoring: false,
    hosts: ['bla.co'],
  });

export const kafkaOutputFormValues = {
  name: {
    selector: SETTINGS_OUTPUTS.NAME_INPUT,
    value: 'kafka test',
  },
  username: {
    selector: SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_USERNAME_INPUT,
    value: 'test_username',
  },
  password: {
    selector: SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_PASSWORD_INPUT,
    value: 'test_password',
  },
  hash: {
    selector: SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_INPUT,
    value: 'testHash',
  },
  defaultTopic: {
    selector: SETTINGS_OUTPUTS_KAFKA.TOPICS_DEFAULT_TOPIC_INPUT,
    value: 'testDefaultTopic',
  },
  firstTopic: {
    selector: SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT,
    value: 'testTopic1',
  },
  firstTopicCondition: {
    selector: SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT,
    value: 'testCondition',
  },
  firstTopicWhen: {
    selector: SETTINGS_OUTPUTS_KAFKA.TOPICS_WHEN_INPUT,
    value: 'equals',
  },
  secondTopic: {
    selector: getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.TOPICS_TOPIC_INPUT, 1),
    value: 'testTopic1',
  },
  secondTopicCondition: {
    selector: getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.TOPICS_CONDITION_INPUT, 1),
    value: 'testCondition1',
  },
  secondTopicWhen: {
    selector: getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.TOPICS_WHEN_INPUT, 1),
    value: 'contains',
  },
  firstHeaderKey: {
    selector: SETTINGS_OUTPUTS_KAFKA.HEADERS_KEY_INPUT,
    value: 'testKey',
  },
  firstHeaderValue: {
    selector: SETTINGS_OUTPUTS_KAFKA.HEADERS_VALUE_INPUT,
    value: 'testValue',
  },
  secondHeaderKey: {
    selector: getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.HEADERS_KEY_INPUT, 1),
    value: 'testKey1',
  },
  secondHeaderValue: {
    selector: getSpecificSelectorId(SETTINGS_OUTPUTS_KAFKA.HEADERS_VALUE_INPUT, 1),
    value: 'testValue1',
  },
  compressionCoded: {
    selector: SETTINGS_OUTPUTS_KAFKA.COMPRESSION_CODEC_INPUT,
    value: 'gzip',
  },
  compressionLevel: {
    selector: SETTINGS_OUTPUTS_KAFKA.COMPRESSION_LEVEL_INPUT,
    value: '1',
  },
  brokerAckReliability: {
    selector: SETTINGS_OUTPUTS_KAFKA.BROKER_ACK_RELIABILITY_SELECT,
    value: 'Do not wait',
  },
  brokerChannelBufferSize: {
    selector: SETTINGS_OUTPUTS_KAFKA.BROKER_CHANNEL_BUFFER_SIZE_SELECT,
    value: '512',
  },
  brokerTimeout: {
    selector: SETTINGS_OUTPUTS_KAFKA.BROKER_TIMEOUT_SELECT,
    value: '10',
  },
  brokerReachabilityTimeout: {
    selector: SETTINGS_OUTPUTS_KAFKA.BROKER_REACHABILITY_TIMEOUT_SELECT,
    value: '20',
  },
  key: {
    selector: SETTINGS_OUTPUTS_KAFKA.KEY_INPUT,
    value: 'testKey',
  },
};

export const resetKafkaOutputForm = () => {
  cy.getBySel(kafkaOutputFormValues.name.selector).clear();
  cy.get('[placeholder="Specify host"').clear();
  cy.getBySel(kafkaOutputFormValues.username.selector).clear();
  cy.getBySel(kafkaOutputFormValues.password.selector).clear();
  cy.getBySel(kafkaOutputFormValues.defaultTopic.selector).clear();
  cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_SWITCH).click();
};

export const fillInKafkaOutputForm = () => {
  cy.getBySel(kafkaOutputFormValues.name.selector).type(kafkaOutputFormValues.name.value);
  cy.get('[placeholder="Specify host"').clear().type('http://localhost:5000');
  cy.getBySel(kafkaOutputFormValues.username.selector).type(kafkaOutputFormValues.username.value);
  cy.getBySel(kafkaOutputFormValues.password.selector).type(kafkaOutputFormValues.password.value);

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
};

export const validateSavedKafkaOutputForm = () => {
  Object.keys(kafkaOutputFormValues).forEach((key: string) => {
    const { selector, value } = kafkaOutputFormValues[key as keyof typeof kafkaOutputFormValues];
    cy.getBySel(selector).should('have.value', value);
  });

  cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).should('have.value', 'kafka');

  cy.getBySel(SETTINGS_OUTPUTS_KAFKA.AUTHENTICATION_SASL_SCRAM_256_OPTION)
    .find('input')
    .should('be.checked');
  cy.getBySel(SETTINGS_OUTPUTS_KAFKA.PARTITIONING_HASH_OPTION).find('input').should('be.checked');

  cy.getBySel(SETTINGS_OUTPUTS_KAFKA.COMPRESSION_SWITCH).should(
    'have.attr',
    'aria-checked',
    'true'
  );
};

export const validateOutputTypeChangeToKafka = (outputId: string) => {
  visit(`/app/fleet/settings/outputs/${outputId}`);
  cy.getBySel(kafkaOutputFormValues.name.selector).clear();
  cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).select('kafka');
  fillInKafkaOutputForm();
  cy.intercept('PUT', '**/api/fleet/outputs/**').as('saveOutput');

  cy.getBySel(SETTINGS_SAVE_BTN).click();
  cy.getBySel(SETTINGS_CONFIRM_MODAL_BTN).click();

  // wait for the save request to finish to avoid race condition
  cy.wait('@saveOutput').then(() => {
    visit(`/app/fleet/settings/outputs/${outputId}`);
  });

  validateSavedKafkaOutputForm();
};

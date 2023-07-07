/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visit } from '../tasks/common';

import { getSpecificSelectorId, SETTINGS_OUTPUTS, SETTINGS_OUTPUTS_KAFKA } from './fleet';

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

export const cleanupKafkaOutput = (outputId: string) => {
  cy.request({
    method: 'DELETE',
    url: `/api/fleet/outputs/${outputId}`,
    headers: { 'kbn-xsrf': 'xx' },
  });
};

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

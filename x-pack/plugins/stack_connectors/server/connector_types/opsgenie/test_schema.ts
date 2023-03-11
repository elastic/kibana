/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloseAlertParams, CreateAlertParams } from './types';

export const ValidCreateAlertSchema: CreateAlertParams = {
  message: 'a message',
  alias: 'an alias',
  description: 'a description',
  responders: [
    { name: 'name for team', type: 'team' },
    { name: 'name for user', type: 'user' },
    { name: 'name for escalation', type: 'escalation' },
    { name: 'name for schedule', type: 'schedule' },
    {
      id: '4513b7ea-3b91-438f-b7e4-e3e54af9147c',
      type: 'team',
    },
    {
      name: 'NOC',
      type: 'team',
    },
    {
      id: 'bb4d9938-c3c2-455d-aaab-727aa701c0d8',
      type: 'user',
    },
    {
      username: 'trinity@opsgenie.com',
      type: 'user',
    },
    {
      id: 'aee8a0de-c80f-4515-a232-501c0bc9d715',
      type: 'escalation',
    },
    {
      name: 'Nightwatch Escalation',
      type: 'escalation',
    },
    {
      id: '80564037-1984-4f38-b98e-8a1f662df552',
      type: 'schedule',
    },
    {
      name: 'First Responders Schedule',
      type: 'schedule',
    },
  ],
  visibleTo: [
    { name: 'name for team', type: 'team' },
    { id: 'id for team', type: 'team' },
    { id: 'id for user', type: 'user' },
    { username: 'username for user', type: 'user' },
  ],
  actions: ['action1', 'action2'],
  tags: ['tag1', 'tag2'],
  details: { keyA: 'valueA', keyB: 'valueB' },
  entity: 'an entity',
  source: 'a source',
  priority: 'P2',
  user: 'a user',
  note: 'a note',
};

/**
 * This example is pulled from the sample curl request here: https://docs.opsgenie.com/docs/alert-api#create-alert
 */
export const OpsgenieCreateAlertExample: CreateAlertParams = {
  message: 'An example alert message',
  alias: 'Life is too short for no alias',
  description: 'Every alert needs a description',
  responders: [
    { id: '4513b7ea-3b91-438f-b7e4-e3e54af9147c', type: 'team' },
    { name: 'NOC', type: 'team' },
    { id: 'bb4d9938-c3c2-455d-aaab-727aa701c0d8', type: 'user' },
    { username: 'trinity@opsgenie.com', type: 'user' },
    { id: 'aee8a0de-c80f-4515-a232-501c0bc9d715', type: 'escalation' },
    { name: 'Nightwatch Escalation', type: 'escalation' },
    { id: '80564037-1984-4f38-b98e-8a1f662df552', type: 'schedule' },
    { name: 'First Responders Schedule', type: 'schedule' },
  ],
  visibleTo: [
    { id: '4513b7ea-3b91-438f-b7e4-e3e54af9147c', type: 'team' },
    { name: 'rocket_team', type: 'team' },
    { id: 'bb4d9938-c3c2-455d-aaab-727aa701c0d8', type: 'user' },
    { username: 'trinity@opsgenie.com', type: 'user' },
  ],
  actions: ['Restart', 'AnExampleAction'],
  tags: ['OverwriteQuietHours', 'Critical'],
  details: { key1: 'value1', key2: 'value2' },
  entity: 'An example entity',
  priority: 'P1',
};

/**
 * This example is pulled from the sample curl request here: https://docs.opsgenie.com/docs/alert-api#close-alert
 * with the addition of the alias field.
 */
export const OpsgenieCloseAlertExample: CloseAlertParams = {
  alias: '123',
  user: 'Monitoring Script',
  source: 'AWS Lambda',
  note: 'Action executed via Alert API',
};

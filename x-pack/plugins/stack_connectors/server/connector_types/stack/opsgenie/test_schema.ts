/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAlertParams } from './types';

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

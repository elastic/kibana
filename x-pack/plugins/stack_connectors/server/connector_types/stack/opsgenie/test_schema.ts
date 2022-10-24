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

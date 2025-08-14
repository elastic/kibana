/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTypeDefinition } from '@kbn/onechat-plugin/server/services/data';

export const workChatDataTypes: DataTypeDefinition[] = [
  {
    id: 'workchat-conversations',
    name: 'WorkChat Conversations',
  },
  {
    id: 'workchat-documents',
    name: 'WorkChat Documents',
  },
  {
    id: 'workchat-knowledge-base',
    name: 'WorkChat Knowledge Base',
  },
  {
    id: 'workchat-user-preferences',
    name: 'WorkChat User Preferences',
  },
];

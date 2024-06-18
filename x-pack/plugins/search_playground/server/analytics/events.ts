/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventTypeOpts } from '@kbn/core/server';

export interface SendMessageEventData {
  connectorType: string;
  model: string;
  isCitationsEnabled: boolean;
}

export const sendMessageEvent: EventTypeOpts<SendMessageEventData> = {
  eventType: 'search_playground-send_massage',
  schema: {
    connectorType: {
      type: 'keyword',
      _meta: { description: 'The type of connector used to send the message' },
    },
    model: { type: 'keyword', _meta: { description: 'LLM model' } },
    isCitationsEnabled: {
      type: 'boolean',
      _meta: { description: 'Whether citations are enabled' },
    },
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getComments } from '.';
import type { ConversationRole } from '@kbn/elastic-assistant/impl/assistant_context/types';

const user: ConversationRole = 'user';
describe('getComments', () => {
  it('Does not add error state message has no error', () => {
    const currentConversation = {
      apiConfig: {},
      id: '1',
      messages: [
        {
          role: user,
          content: 'Hello {name}',
          timestamp: '2022-01-01',
          isError: false,
        },
      ],
    };
    const lastCommentRef = { current: null };
    const showAnonymizedValues = false;

    const result = getComments({ currentConversation, lastCommentRef, showAnonymizedValues });
    expect(result[0].eventColor).toEqual(undefined);
  });
  it('Adds error state when message has error', () => {
    const currentConversation = {
      apiConfig: {},
      id: '1',
      messages: [
        {
          role: user,
          content: 'Hello {name}',
          timestamp: '2022-01-01',
          isError: true,
        },
      ],
    };
    const lastCommentRef = { current: null };
    const showAnonymizedValues = false;

    const result = getComments({ currentConversation, lastCommentRef, showAnonymizedValues });
    expect(result[0].eventColor).toEqual('danger');
  });
});

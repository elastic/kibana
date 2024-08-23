/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import { chatClient, esClient } from '../../services';

describe('kb functions', () => {
  it('summarizes and recalls information', async () => {
    let conversation = await chatClient.complete(
      'Remember that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What is this cluster used for?',
        role: MessageRole.User,
      })
    );

    const result = await chatClient.evaluate(conversation, [
      'Calls the summarize function',
      'Effectively summarizes and remembers that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
      'Calls the "context" function to respond to What is this cluster used for?',
      'Effectively recalls that this cluster is used to test the AI Assistant using the Observability AI Evaluation Framework',
    ]);

    expect(result.passed).to.be(true);
  });

  after(async () => {
    await esClient.deleteByQuery({
      index: '.kibana-observability-ai-assistant-kb-*',
      ignore_unavailable: true,
      query: {
        match: {
          text: {
            query: '*Observability AI Evaluation Framework*',
          },
        },
      },
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { chatClient } from '../../services';
import { MessageRole } from '../../../../common';

describe('kb functions', () => {

  it('summarizes and recalls information', async () => {
    let conversation = await chatClient.complete(
      'Remember that this cluster is used to test the AI Assistant using an Evaluation Framework'
    );

    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: 'What is this cluster used for?',
        role: MessageRole.User
      })
    );


    const result = await chatClient.evaluate(conversation, [
      'Calls the summarize function',
      'Effectively summarizes and remembers that this cluster is used to test the AI Assistant using an Evaluation Framework',
      'Calls the recall function to respond to What is this cluster used for?',
      'Effectively recalls that this cluster is used to test the AI Assistant using an Evaluation Framework',
    ]);

    expect(result.passed).to.be(true);
  });
})

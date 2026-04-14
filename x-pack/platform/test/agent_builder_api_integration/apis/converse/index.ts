/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionMode } from '../../utils/agent_builder_client';
import type { AgentBuilderApiFtrProviderContext } from '../../../agent_builder/services/api';
import { createSimpleConversationTests } from './simple_conversation';
import { createMultiRoundsTests } from './multi_rounds';
import { createToolCallingTests } from './tool_calling';
import { createAttachmentsTests } from './attachments';
import { createErrorHandlingTests } from './error_handling';
import { createRegenerateTests } from './regenerate';

const executionModes: ExecutionMode[] = ['local', 'task_manager'];

export default function (context: AgentBuilderApiFtrProviderContext) {
  describe('Converse API', function () {
    for (const mode of executionModes) {
      describe(`execution mode: ${mode}`, function () {
        createSimpleConversationTests(mode)(context);
        createMultiRoundsTests(mode)(context);
        createToolCallingTests(mode)(context);
        createAttachmentsTests(mode)(context);
        createErrorHandlingTests(mode)(context);
        createRegenerateTests(mode)(context);
      });
    }
  });
}

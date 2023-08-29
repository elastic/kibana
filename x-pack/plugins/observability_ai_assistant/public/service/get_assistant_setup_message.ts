/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '../../common';
import { ContextDefinition } from '../../common/types';

export function getAssistantSetupMessage({ contexts }: { contexts: ContextDefinition[] }) {
  return {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.System as const,
      content: contexts.map((context) => context.description).join('\n'),
    },
  };
}

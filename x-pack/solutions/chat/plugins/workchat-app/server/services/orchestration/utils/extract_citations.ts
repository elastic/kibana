/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, isToolMessage } from '@langchain/core/messages';
import type { ContentRef } from '@kbn/wci-common';

/**
 * Extract the content reference from the tool call messages contains some.
 */
export const extractCitations = ({ messages }: { messages: BaseMessage[] }): ContentRef[] => {
  const refs: ContentRef[] = [];

  messages.forEach((message) => {
    // TODO: shall we fallback to check content if no artifact to make sure?
    if (isToolMessage(message) && message.artifact?.citations) {
      refs.push(...message.artifact!.citations);
    }
  });

  return refs;
};

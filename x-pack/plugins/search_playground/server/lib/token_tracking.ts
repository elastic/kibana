/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage } from '@langchain/core/messages';
import { encode } from 'gpt-tokenizer';

export function getTokenEstimate(s: string): number {
  return encode(s).length;
}

export function getTokenEstimateFromMessages(messages: BaseMessage[][]): number {
  return messages.reduce((acc, message) => {
    return acc + message.reduce((acc2, m) => acc2 + getTokenEstimate(m.content.toString()), 0);
  }, 0);
}

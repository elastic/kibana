/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ConversationSummary } from '../../../common/conversations';

/**
 * Limits the conversations array to the most recent N conversations
 */
export const sliceRecentConversations = (
  conversations: ConversationSummary[],
  limit: number
): ConversationSummary[] => {
  if (!limit || limit <= 0 || !conversations?.length) {
    return conversations || [];
  }

  return conversations
    .map((conversation) => {
      return {
        conversation,
        date: moment(conversation.lastUpdated),
      };
    })
    .sort((conv1, conv2) => {
      return conv2.date.valueOf() - conv1.date.valueOf();
    })
    .slice(0, limit)
    .map(({ conversation }) => conversation);
};

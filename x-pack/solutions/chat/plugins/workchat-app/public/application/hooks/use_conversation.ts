/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useWorkChatServices } from './use_workchat_service';
import { queryKeys } from '../query_keys';

export const useConversation = ({ conversationId }: { conversationId: string | undefined }) => {
  const { conversationService } = useWorkChatServices();

  const { data: conversation, isLoading } = useQuery({
    queryKey: queryKeys.conversations.byId(conversationId ?? 'new'),
    queryFn: async () => {
      if (conversationId) {
        return conversationService.get(conversationId);
      }
      return undefined;
    },
  });

  return { conversation, isLoading };
};

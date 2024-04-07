/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  AssistantOverlay as ElasticAssistantOverlay,
  useAssistantContext,
} from '@kbn/elastic-assistant';
import { useQuery } from '@tanstack/react-query';
import type { UserAvatar } from '@kbn/elastic-assistant/impl/assistant_context';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import { useKibana } from '../common/lib/kibana';

export const AssistantOverlay: React.FC = () => {
  const { services } = useKibana();

  const { data: currentUserAvatar } = useQuery({
    queryKey: ['currentUserAvatar'],
    queryFn: () =>
      services.security?.userProfiles.getCurrent<{ avatar: UserAvatar }>({
        dataPath: 'avatar',
      }),
    select: (data) => {
      return data.data.avatar;
    },
    refetchOnWindowFocus: false,
  });

  const { assistantAvailability } = useAssistantContext();
  const aiAssistantFlyoutMode = useIsExperimentalFeatureEnabled('aiAssistantFlyoutMode');

  if (!assistantAvailability.hasAssistantPrivilege) {
    return null;
  }
  return (
    <ElasticAssistantOverlay
      isFlyoutMode={aiAssistantFlyoutMode}
      currentUserAvatar={currentUserAvatar}
    />
  );
};

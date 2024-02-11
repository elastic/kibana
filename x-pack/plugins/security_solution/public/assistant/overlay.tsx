/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  AssistantOverlay as ElasticAssistantOverlay,
  useAssistantContext,
} from '@kbn/elastic-assistant';
import { SECURITY_SOLUTION_ENABLE_AI_ASSISTANT_FLYOUT_MODE } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';

export const AssistantOverlay: React.FC = () => {
  const { assistantAvailability } = useAssistantContext();
  const { uiSettings } = useKibana().services;
  const aiAssistantFlyoutMode = useMemo(
    () => uiSettings?.get<boolean>(SECURITY_SOLUTION_ENABLE_AI_ASSISTANT_FLYOUT_MODE) || false,
    [uiSettings]
  );

  if (!assistantAvailability.hasAssistantPrivilege) {
    return null;
  }
  return <ElasticAssistantOverlay isFlyoutMode={aiAssistantFlyoutMode} />;
};

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

export const AssistantOverlay: React.FC = () => {
  const { assistantAvailability } = useAssistantContext();
  if (!assistantAvailability.hasAssistantPrivilege) {
    return null;
  }
  return <ElasticAssistantOverlay />;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { useEffect, useState } from 'react';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

export function useCurrentUser() {
  const service = useObservabilityAIAssistant();

  const [user, setUser] = useState<AuthenticatedUser>();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const authenticatedUser = await service.getCurrentUser();
        setUser(authenticatedUser);
      } catch {
        setUser(undefined);
      }
    };
    getCurrentUser();
  }, [service]);

  return user;
}

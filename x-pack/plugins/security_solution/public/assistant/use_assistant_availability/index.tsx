/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLicense } from '../../common/hooks/use_license';

export interface UseAssistantAvailability {
  // True when user is Enterprise. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // When true, the Assistant is hidden and unavailable
  hasAssistantPrivilege: boolean;
}

export const useAssistantAvailability = (): UseAssistantAvailability => {
  const isEnterprise = useLicense().isEnterprise();
  return {
    isAssistantEnabled: isEnterprise,
    // TODO: RBAC check (https://github.com/elastic/security-team/issues/6932)
    // Leaving as a placeholder for RBAC as the same behavior will be required
    // When false, the Assistant is hidden and unavailable
    hasAssistantPrivilege: true,
  };
};

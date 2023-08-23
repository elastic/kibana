/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLicense } from '../../common/hooks/use_license';
import { useKibana } from '../../common/lib/kibana';
import { ASSISTANT_FEATURE_ID } from '../../../common/constants';

export interface UseAssistantAvailability {
  // True when user is Enterprise. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // When true, the Assistant is hidden and unavailable
  hasAssistantPrivilege: boolean;
}

export const useAssistantAvailability = (): UseAssistantAvailability => {
  const isEnterprise = useLicense().isEnterprise();
  const capabilities = useKibana().services.application.capabilities;
  const isAssistantEnabled = capabilities[ASSISTANT_FEATURE_ID]?.['ai-assistant'] === true;

  return {
    isAssistantEnabled: isEnterprise,
    hasAssistantPrivilege: isAssistantEnabled,
  };
};

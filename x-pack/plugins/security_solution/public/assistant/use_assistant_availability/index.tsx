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
  // When true, user has `All` privilege for `Connectors and Actions` (show/execute/delete/save ui capabilities)
  hasConnectorsAllPrivilege: boolean;
  // When true, user has `Read` privilege for `Connectors and Actions` (show/execute ui capabilities)
  hasConnectorsReadPrivilege: boolean;
  // When true, user has `Edit` privilege for `AnonymizationFields`
  hasUpdateAIAssistantAnonymization: boolean;
}

export const useAssistantAvailability = (): UseAssistantAvailability => {
  const isEnterprise = useLicense().isEnterprise();
  const capabilities = useKibana().services.application.capabilities;
  const hasAssistantPrivilege = capabilities[ASSISTANT_FEATURE_ID]?.['ai-assistant'] === true;
  const hasUpdateAIAssistantAnonymization =
    capabilities[ASSISTANT_FEATURE_ID]?.updateAIAssistantAnonymization === true;

  // Connectors & Actions capabilities as defined in x-pack/plugins/actions/server/feature.ts
  // `READ` ui capabilities defined as: { ui: ['show', 'execute'] }
  const hasConnectorsReadPrivilege =
    capabilities.actions?.show === true && capabilities.actions?.execute === true;
  // `ALL` ui capabilities defined as: { ui: ['show', 'execute', 'save', 'delete'] }
  const hasConnectorsAllPrivilege =
    hasConnectorsReadPrivilege &&
    capabilities.actions?.delete === true &&
    capabilities.actions?.save === true;

  return {
    hasAssistantPrivilege,
    hasConnectorsAllPrivilege,
    hasConnectorsReadPrivilege,
    isAssistantEnabled: isEnterprise,
    hasUpdateAIAssistantAnonymization,
  };
};

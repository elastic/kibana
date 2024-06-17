/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { SERVER_APP_ID } from '../../../../../../common/constants';
// import { useLicense } from '../../../../../common/hooks/use_license';
// import { useKibana } from '../../../../../common/lib/kibana';

export interface UseAssistantAvailability {
  /**
   * True when assistant is available in the Security Solution product
   **/
  isAvailable: boolean;
  /**
   * True when the user has all the privileges required to use the assistant
   * including fleet and connectors & actions privileges
   **/
  hasPrivileges: boolean;
}

export const useIntegrationsAssistantAvailability = (): UseAssistantAvailability => {
  return {
    isAvailable: true,
    hasPrivileges: true,
  };
};
// export const useIntegrationsAssistantAvailability = (): UseAssistantAvailability => {
//   const isEnterprise = useLicense().isEnterprise();
//   const capabilities = useKibana().services.application.capabilities;
//   // Check the license for ess and integrations-assistant ui feature capability for serverless
//   const isAvailable =
//     isEnterprise && capabilities[SERVER_APP_ID]?.['integrations-assistant'] === true;
//   const hasFleetPrivileges = capabilities.fleet?.all === true && capabilities.fleetv2?.all === true;

//   // Connectors & Actions capabilities as defined in x-pack/plugins/actions/server/feature.ts
//   // `READ` ui capabilities defined as: { ui: ['show', 'execute'] }
//   const hasConnectorsReadPrivilege =
//     capabilities.actions?.show === true && capabilities.actions?.execute === true;
//   // `ALL` ui capabilities defined as: { ui: ['show', 'execute', 'save', 'delete'] }
//   const hasConnectorsAllPrivilege =
//     hasConnectorsReadPrivilege &&
//     capabilities.actions?.delete === true &&
//     capabilities.actions?.save === true;

//   return {
//     isAvailable,
//     hasPrivileges: hasFleetPrivileges && hasConnectorsAllPrivilege && hasConnectorsReadPrivilege,
//   };
// };

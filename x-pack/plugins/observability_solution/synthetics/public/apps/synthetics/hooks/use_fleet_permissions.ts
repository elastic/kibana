/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../plugin';
import {
  BrowserFields,
  ConfigKey,
  EncryptedSyntheticsMonitor,
} from '../../../../common/runtime_types';

export function useFleetPermissions() {
  const { fleet } = useKibana<ClientPluginsStart>().services;

  const canSaveIntegrations: boolean = Boolean(fleet?.authz.integrations.writeIntegrationPolicies);
  const canReadAgentPolicies = Boolean(fleet?.authz.fleet.readAgentPolicies);
  const canCreateAgentPolicies = Boolean(fleet?.authz.fleet.all);

  return {
    canReadAgentPolicies,
    canSaveIntegrations,
    canCreateAgentPolicies,
  };
}

export function useCanManagePrivateLocation() {
  const { canSaveIntegrations, canReadAgentPolicies } = useFleetPermissions();

  return Boolean(canSaveIntegrations && canReadAgentPolicies);
}

export function canUpdatePrivateMonitor(
  monitor: EncryptedSyntheticsMonitor,
  canSaveIntegrations: boolean
) {
  const locations = (monitor as BrowserFields)?.[ConfigKey.LOCATIONS];

  const hasPrivateLocation = locations?.some((location) => !location.isServiceManaged);

  return !(hasPrivateLocation && !canSaveIntegrations);
}

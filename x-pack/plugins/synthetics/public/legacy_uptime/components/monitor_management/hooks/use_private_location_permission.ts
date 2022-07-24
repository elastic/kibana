/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ClientPluginsStart } from '../../../../plugin';
import { BrowserFields, ConfigKey } from '../../../../../common/runtime_types';

export function usePrivateLocationPermissions(monitor?: BrowserFields) {
  const kServices = useKibana<ClientPluginsStart>().services;

  const canSaveIntegrations: boolean =
    !!kServices?.fleet?.authz.integrations.writeIntegrationPolicies;

  const locations = (monitor as BrowserFields)?.[ConfigKey.LOCATIONS];

  const hasPrivateLocation = locations?.some((location) => !location.isServiceManaged);

  const canUpdatePrivateMonitor = !(hasPrivateLocation && !canSaveIntegrations);

  return { canUpdatePrivateMonitor };
}

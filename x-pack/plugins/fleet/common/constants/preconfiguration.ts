/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { PreconfiguredAgentPolicy } from '../types';

import { defaultPackages } from './epm';

export const PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE =
  'fleet-preconfiguration-deletion-record';

export const PRECONFIGURATION_LATEST_KEYWORD = 'latest';

export const DEFAULT_AGENT_POLICY: PreconfiguredAgentPolicy = {
  name: 'Default policy',
  namespace: 'default',
  description: 'Default agent policy created by Kibana',
  package_policies: [
    {
      name: i18n.translate('xpack.fleet.agentPolicies.defaultAgentPolicySystemIntegrationName', {
        defaultMessage: 'System',
      }),
      package: {
        name: defaultPackages.System,
      },
    },
  ],
  is_default: true,
  is_managed: false,
  monitoring_enabled: ['logs', 'metrics'] as Array<'logs' | 'metrics'>,
  id: 'default-agent-policy',
};

export const DEFAULT_FLEET_SERVER_AGENT_POLICY: PreconfiguredAgentPolicy = {
  name: 'Default Fleet Server policy',
  namespace: 'default',
  description: 'Default Fleet Server agent policy created by Kibana',
  package_policies: [
    {
      name: i18n.translate(
        'xpack.fleet.agentPolicies.defaultAgentPolicyFleetServerIntegrationName',
        {
          defaultMessage: 'Fleet Server',
        }
      ),
      package: {
        name: defaultPackages.FleetServer,
      },
    },
  ],
  is_default: false,
  is_default_fleet_server: true,
  is_managed: false,
  monitoring_enabled: ['logs', 'metrics'] as Array<'logs' | 'metrics'>,
  id: 'default-fleet-server-agent-policy',
};

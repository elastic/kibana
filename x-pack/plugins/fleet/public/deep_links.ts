/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppDeepLink } from '@kbn/core/public';

import type { ExperimentalFeatures } from '../common/experimental_features';

import { FLEET_ROUTING_PATHS } from './constants/page_paths';

export enum FleetDeepLinkId {
  agents = 'agents',
  policies = 'policies',
  enrollmentTokens = 'enrollment_tokens',
  uninstallTokens = 'uninstall_tokens',
  dataStreams = 'data_streams',
  settings = 'settings',
}

export const getFleetDeepLinks: (experimentalFeatures: ExperimentalFeatures) => AppDeepLink[] = (
  experimentalFeatures
) => [
  {
    id: FleetDeepLinkId.agents,
    title: i18n.translate('xpack.fleet.deepLinks.agents.title', { defaultMessage: 'Agents' }),
    path: FLEET_ROUTING_PATHS.agents,
  },
  {
    id: FleetDeepLinkId.policies,
    title: i18n.translate('xpack.fleet.deepLinks.policies.title', {
      defaultMessage: 'Agent policies',
    }),
    path: FLEET_ROUTING_PATHS.policies,
  },
  {
    id: FleetDeepLinkId.enrollmentTokens,
    title: i18n.translate('xpack.fleet.deepLinks.enrollmentTokens.title', {
      defaultMessage: 'Enrollment tokens',
    }),
    path: FLEET_ROUTING_PATHS.enrollment_tokens,
  },
  ...(experimentalFeatures.agentTamperProtectionEnabled
    ? [
        {
          id: FleetDeepLinkId.uninstallTokens,
          title: i18n.translate('xpack.fleet.deepLinks.uninstallTokens.title', {
            defaultMessage: 'Uninstall tokens',
          }),
          path: FLEET_ROUTING_PATHS.uninstall_tokens,
        },
      ]
    : []),
  {
    id: FleetDeepLinkId.dataStreams,
    title: i18n.translate('xpack.fleet.deepLinks.dataStreams.title', {
      defaultMessage: 'Data streams',
    }),
    path: FLEET_ROUTING_PATHS.data_streams,
  },
  {
    id: FleetDeepLinkId.settings,
    title: i18n.translate('xpack.fleet.deepLinks.settings.title', {
      defaultMessage: 'Settings',
    }),
    path: FLEET_ROUTING_PATHS.settings,
  },
];

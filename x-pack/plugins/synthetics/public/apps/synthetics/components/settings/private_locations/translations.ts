/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NEED_PERMISSIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.needPermissions',
  {
    defaultMessage: 'Need permissions',
  }
);

export const NEED_FLEET_READ_AGENT_POLICIES_PERMISSION = i18n.translate(
  'xpack.synthetics.monitorManagement.needFleetReadAgentPoliciesPermission',
  {
    defaultMessage:
      'You are not authorized to access Fleet. Fleet permissions are required to create new private locations.',
  }
);

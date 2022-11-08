/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { noResponseActionsRole } from './without_response_actions_role';

export const withResponseActionsRole: Omit<Role, 'name'> = {
  ...noResponseActionsRole,
  kibana: [
    {
      ...noResponseActionsRole.kibana[0],
      feature: {
        ...noResponseActionsRole.kibana[0].feature,
        siem: [
          ...noResponseActionsRole.kibana[0].feature.siem,
          'host_isolation_all',
          'process_operations_all',
          'file_operations_all',
        ],
      },
    },
  ],
};

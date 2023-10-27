/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';

export const getEndpointOperationsAnalyst: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: [
            'metrics-endpoint.metadata_current_*',
            '.fleet-agents*',
            '.fleet-actions*',
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
            '.lists*',
            '.items*',
          ],
          privileges: ['read'],
        },
        {
          names: [
            '.alerts-security*',
            '.siem-signals-*',
            '.preview.alerts-security*',
            '.internal.preview.alerts-security*',
          ],
          privileges: ['read', 'write'],
        },
      ],
      run_as: [],
    },
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          siem: [
            'minimal_all',

            'policy_management_all',

            'trusted_applications_all',
            'event_filters_all',
            'host_isolation_exceptions_all',
            'blocklist_all',

            'host_isolation_all',
            'process_operations_all',
            'actions_log_management_all',
          ],
        },
      },
    ],
  };
};

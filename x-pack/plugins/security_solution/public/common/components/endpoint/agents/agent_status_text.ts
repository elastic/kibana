/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HostStatus } from '../../../../../common/endpoint/types';

export const getAgentStatusText = (hostStatus: HostStatus) => {
  return i18n.translate('xpack.securitySolution.endpoint.list.hostStatusValue', {
    defaultMessage:
      '{hostStatus, select, healthy {Healthy} unhealthy {Unhealthy} updating {Updating} offline {Offline} inactive {Inactive} unenrolled {Unenrolled} other {Unhealthy}}',
    values: { hostStatus },
  });
};

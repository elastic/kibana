/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { HostStatus } from '../../../../common/endpoint/types';
import { HOST_STATUS_TO_BADGE_COLOR } from '../../../management/pages/endpoint_hosts/view/host_constants';
import { getAgentStatusText } from './agent_status_text';

export const AgentStatus = React.memo(({ hostStatus }: { hostStatus: HostStatus }) => {
  return (
    <EuiBadge
      color={hostStatus != null ? HOST_STATUS_TO_BADGE_COLOR[hostStatus] : 'warning'}
      data-test-subj="rowHostStatus"
      className="eui-textTruncate"
    >
      {getAgentStatusText(hostStatus)}
    </EuiBadge>
  );
});

AgentStatus.displayName = 'AgentStatus';

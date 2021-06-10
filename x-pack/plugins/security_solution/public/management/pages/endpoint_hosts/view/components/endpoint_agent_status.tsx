/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { HostInfo, HostMetadata } from '../../../../../../common/endpoint/types';
import { HOST_STATUS_TO_BADGE_COLOR } from '../host_constants';
import { EndpointHostIsolationStatus } from '../../../../../common/components/endpoint/host_isolation';
import { isEndpointHostIsolated } from '../../../../../common/utils/validators';

export interface EndpointAgentStatusProps {
  hostStatus: HostInfo['host_status'];
  endpointMetadata: HostMetadata;
}
export const EndpointAgentStatus = memo<EndpointAgentStatusProps>(
  ({ endpointMetadata, hostStatus }) => {
    return (
      <>
        <EuiBadge
          color={hostStatus != null ? HOST_STATUS_TO_BADGE_COLOR[hostStatus] : 'warning'}
          data-test-subj="rowHostStatus"
          className="eui-textTruncate"
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.list.hostStatusValue"
            defaultMessage="{hostStatus, select, healthy {Healthy} unhealthy {Unhealthy} updating {Updating} offline {Offline} inactive {Inactive} other {Unhealthy}}"
            values={{ hostStatus }}
          />
        </EuiBadge>
        <EndpointHostIsolationStatus
          isIsolated={isEndpointHostIsolated(endpointMetadata)}
          pendingIsolate={Math.random() < 0.5 ? 1 : 0}
          pendingUnIsolate={Math.random() < 0.5 ? 1 : 0}
        />
      </>
    );
  }
);

EndpointAgentStatus.displayName = 'EndpointAgentStatus';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useAgentStatus } from '../../../../common/hooks/use_agent_status';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  type ResponseActionAgentType,
} from '../../../../../common/endpoint/service/response_actions/constants';
import { HostStatus } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL } from '../../../common/constants';

interface OfflineCalloutProps {
  agentType: ResponseActionAgentType;
  endpointId: string;
  hostName: string;
}

export const OfflineCallout = memo<OfflineCalloutProps>(({ agentType, endpointId, hostName }) => {
  const { data } = useAgentStatus([endpointId], agentType, {
    refetchInterval: DEFAULT_POLL_INTERVAL,
    enabled: RESPONSE_ACTION_AGENT_TYPE.includes(agentType),
  });

  const agentStatus = data?.[endpointId];

  const showOfflineCallout = useMemo(
    () => agentStatus?.status === HostStatus.OFFLINE,
    [agentStatus]
  );

  if (!agentStatus) {
    return null;
  }

  if (showOfflineCallout) {
    return (
      <>
        <EuiCallOut
          iconType="offline"
          color="warning"
          data-test-subj="offlineCallout"
          title={i18n.translate('xpack.securitySolution.responder.hostOffline.callout.title', {
            defaultMessage: 'Host Offline',
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.securitySolution.responder.hostOffline.callout.body"
              defaultMessage="The host {name} is offline, so its responses may be delayed. Pending commands will execute when the host reconnects."
              values={{ name: <strong>{hostName}</strong> }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return null;
});

OfflineCallout.displayName = 'OfflineCallout';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCallOut, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EndpointHostIsolationStatusProps } from '../../../../common/components/endpoint/host_isolation';
import { useFetchEndpointPendingActionsSummary } from '../../../hooks/endpoint/use_fetch_endpoint_pending_actions_summary';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { EndpointPolicyStatus } from '../../endpoint_policy_status';
import { EndpointAgentAndIsolationStatus } from '../../endpoint_agent_and_isolation_status';
import { useGetEndpointHostInfo } from '../../../hooks';
import { HostMetadata } from '../../../../../common/endpoint/types';
import { Command } from '../../console';
import { CommandExecutionResponse } from '../../console/types';
import { FormattedError } from '../../formatted_error';

interface EndpointStatusActionResultProps {
  endpointId: string;
}

export const EndpointStatusActionResult = memo<EndpointStatusActionResultProps>(
  ({ endpointId }) => {
    const { isFetching, error, data: endpointInfo } = useGetEndpointHostInfo(endpointId);
    const { data: endpointPendingActions } = useFetchEndpointPendingActionsSummary([endpointId]);

    const pendingIsolationActions = useMemo<
      Pick<Required<EndpointHostIsolationStatusProps>, 'pendingIsolate' | 'pendingUnIsolate'>
    >(() => {
      if (endpointPendingActions?.data.length) {
        const pendingActions = endpointPendingActions.data[0].pending_actions;

        return {
          pendingIsolate: pendingActions.isolate ?? 0,
          pendingUnIsolate: pendingActions.unisolate ?? 0,
        };
      }
      return {
        pendingIsolate: 0,
        pendingUnIsolate: 0,
      };
    }, [endpointPendingActions?.data]);

    if (isFetching) {
      return null;
    }

    if (error) {
      return (
        <EuiCallOut>
          <EuiFieldText>
            <FormattedError error={error} />
          </EuiFieldText>
        </EuiCallOut>
      );
    }

    if (!endpointInfo) {
      return null;
    }

    return (
      <EuiFlexGroup wrap={false} responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpointResponseActions.status.agentStatus"
              defaultMessage="Agent status"
            />
          </EuiText>
          <EndpointAgentAndIsolationStatus
            status={endpointInfo.host_status}
            isIsolated={Boolean(endpointInfo.metadata.Endpoint.state?.isolation)}
            {...pendingIsolationActions}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpointResponseActions.status.policyStatus"
              defaultMessage="Policy status"
            />
          </EuiText>
          <EndpointPolicyStatus policyApplied={endpointInfo.metadata.Endpoint.policy.applied} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpointResponseActions.status.lastActive"
              defaultMessage="Last active"
            />
          </EuiText>
          <EuiText>
            <FormattedDate
              fieldName={i18n.translate(
                'xpack.securitySolution.endpointResponseActions.status.lastActive',
                { defaultMessage: 'Last active' }
              )}
              value={endpointInfo.metadata['@timestamp']}
              className="eui-textTruncate"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
EndpointStatusActionResult.displayName = 'EndpointStatusActionResult';

export const handleStatusAction = async (
  endpointMetadata: HostMetadata,
  command: Command
): Promise<CommandExecutionResponse> => {
  return {
    result: <EndpointStatusActionResult endpointId={endpointMetadata.agent.id} />,
  };
};

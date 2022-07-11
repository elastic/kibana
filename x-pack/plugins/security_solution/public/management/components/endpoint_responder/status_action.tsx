/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { v4 as uuidV4 } from 'uuid';
import type { HostInfo, PendingActionsResponse } from '../../../../common/endpoint/types';
import type { EndpointCommandDefinitionMeta } from './types';
import type { EndpointHostIsolationStatusProps } from '../../../common/components/endpoint/host_isolation';
import { useGetEndpointPendingActionsSummary } from '../../hooks/endpoint/use_get_endpoint_pending_actions_summary';
import { FormattedDate } from '../../../common/components/formatted_date';
import { EndpointAppliedPolicyStatus } from '../endpoint_applied_policy_status';
import { EndpointAgentAndIsolationStatus } from '../endpoint_agent_and_isolation_status';
import { useGetEndpointDetails } from '../../hooks';
import type { CommandExecutionComponentProps } from '../console/types';
import { FormattedError } from '../formatted_error';

export const EndpointStatusActionResult = memo<
  CommandExecutionComponentProps<
    {},
    {
      apiCalled?: boolean;
      endpointDetails?: HostInfo;
      detailsFetchError?: IHttpFetchError;
      endpointPendingActions?: PendingActionsResponse;
    },
    EndpointCommandDefinitionMeta
  >
>(({ command, status, setStatus, store, setStore, ResultComponent }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId as string;
  const { endpointPendingActions, endpointDetails, detailsFetchError, apiCalled } = store;
  const isPending = status === 'pending';
  const queryKey = useMemo(() => {
    return uuidV4();
  }, []);

  const {
    data: fetchedEndpointDetails,
    error: fetchedDetailsError,
    isFetching,
    isFetched,
  } = useGetEndpointDetails(endpointId, { enabled: isPending, queryKey });

  const { data: fetchedPendingActionsSummary } = useGetEndpointPendingActionsSummary([endpointId], {
    enabled: isPending,
    queryKey,
  });

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

  useEffect(() => {
    if (!isPending) {
      setStore((prevState) => {
        return {
          ...prevState,
          apiCalled: true,
        };
      });
    }
  }, [apiCalled, isPending, setStore]);

  // update command store if endpoint details fetch api call completed
  useEffect(() => {
    if (isFetched && isPending) {
      setStatus(detailsFetchError ? 'error' : 'success');
      setStore((prevState) => {
        return {
          ...prevState,
          endpointDetails: fetchedEndpointDetails,
          detailsFetchError: fetchedDetailsError ?? undefined,
        };
      });
    }
  }, [
    detailsFetchError,
    isFetched,
    setStatus,
    isPending,
    setStore,
    fetchedEndpointDetails,
    fetchedDetailsError,
  ]);

  // Update the store once we get back pending actions for this endpoint
  useEffect(() => {
    if (fetchedPendingActionsSummary) {
      setStore((prevState) => {
        return {
          ...prevState,
          endpointPendingActions: fetchedPendingActionsSummary,
        };
      });
    }
  }, [fetchedPendingActionsSummary, setStore]);

  if (detailsFetchError) {
    return (
      <ResultComponent showAs="failure">
        <FormattedError error={detailsFetchError} />
      </ResultComponent>
    );
  }

  if (isFetching || !endpointDetails) {
    return <ResultComponent showAs="pending" />;
  }

  return (
    <ResultComponent showTitle={false}>
      <EuiFlexGroup wrap={false} responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpointResponseActions.status.agentStatus"
              defaultMessage="Agent status"
            />
          </EuiText>
          <EndpointAgentAndIsolationStatus
            status={endpointDetails.host_status}
            isIsolated={Boolean(endpointDetails.metadata.Endpoint.state?.isolation)}
            {...pendingIsolationActions}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpointResponseActions.status.version"
              defaultMessage="Version"
            />
          </EuiText>
          <EuiText>{endpointDetails.metadata.agent.version}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.endpointResponseActions.status.policyStatus"
              defaultMessage="Policy status"
            />
          </EuiText>
          <EndpointAppliedPolicyStatus
            policyApplied={endpointDetails.metadata.Endpoint.policy.applied}
          />
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
              value={endpointDetails.metadata['@timestamp']}
              className="eui-textTruncate"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ResultComponent>
  );
});
EndpointStatusActionResult.displayName = 'EndpointStatusActionResult';

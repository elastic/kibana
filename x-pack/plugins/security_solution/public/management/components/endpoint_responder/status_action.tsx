/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { EuiCallOut, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { v4 as uuidV4 } from 'uuid';
import type { HostInfo, PendingActionsResponse } from '../../../../common/endpoint/types';
import type { EndpointCommandDefinitionMeta } from './types';
import { EndpointHostIsolationStatusProps } from '../../../common/components/endpoint/host_isolation';
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
>(({ command, status, setStatus, store, setStore }) => {
  const endpointId = command.commandDefinition?.meta?.endpointId as string;
  const { endpointPendingActions, endpointDetails, detailsFetchError, apiCalled } = store;
  const isPending = status === 'pending';

  const {
    isFetching,
    isFetched,
    refetch: fetchEndpointDetails,
  } = useGetEndpointDetails(endpointId, { enabled: false });

  const { refetch: fetchEndpointPendingActionsSummary } = useGetEndpointPendingActionsSummary(
    [endpointId],
    { enabled: false }
  );

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
    if (!apiCalled) {
      setStore((prevState) => {
        return {
          ...prevState,
          apiCalled: true,
        };
      });

      // Using a unique `queryKey` here and below so that data is NOT updated
      // from cache when future requests for this endpoint ID is done again.
      fetchEndpointDetails({ queryKey: uuidV4() })
        .then(({ data }) => {
          setStore((prevState) => {
            return {
              ...prevState,
              endpointDetails: data,
            };
          });
        })
        .catch((err) => {
          setStore((prevState) => {
            return {
              ...prevState,
              detailsFetchError: err,
            };
          });
        });

      fetchEndpointPendingActionsSummary({ queryKey: uuidV4() }).then(({ data }) => {
        setStore((prevState) => {
          return {
            ...prevState,
            endpointPendingActions: data,
          };
        });
      });
    }
  }, [apiCalled, fetchEndpointDetails, fetchEndpointPendingActionsSummary, setStore]);

  useEffect(() => {
    if (isFetched && isPending) {
      setStatus(detailsFetchError ? 'error' : 'success');
    }
  }, [detailsFetchError, isFetched, setStatus, isPending]);

  if (isFetching) {
    return null;
  }

  if (detailsFetchError) {
    return (
      <EuiCallOut>
        <EuiFieldText>
          <FormattedError error={detailsFetchError} />
        </EuiFieldText>
      </EuiCallOut>
    );
  }

  if (!endpointDetails) {
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
  );
});
EndpointStatusActionResult.displayName = 'EndpointStatusActionResult';

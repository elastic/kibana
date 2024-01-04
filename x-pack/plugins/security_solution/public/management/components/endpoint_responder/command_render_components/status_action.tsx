/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { v4 as uuidV4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { HostInfo, PendingActionsResponse } from '../../../../../common/endpoint/types';
import type { EndpointCommandDefinitionMeta } from '../types';
import { useGetEndpointPendingActionsSummary } from '../../../hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { useGetEndpointDetails } from '../../../hooks';
import type { CommandExecutionComponentProps } from '../../console/types';
import { FormattedError } from '../../formatted_error';
import { ConsoleCodeBlock } from '../../console/components/console_code_block';
import { POLICY_STATUS_TO_TEXT } from '../../../pages/endpoint_hosts/view/host_constants';
import { getAgentStatusText } from '../../../../common/components/endpoint/agent_status_text';

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
  } = useGetEndpointDetails(endpointId, { enabled: isPending, queryKey: [queryKey] });

  const { data: fetchedPendingActionsSummary } = useGetEndpointPendingActionsSummary([endpointId], {
    enabled: isPending,
    queryKey: [queryKey, endpointId],
  });

  const pendingIsolationActions = useMemo<{
    pendingIsolate: number;
    pendingUnIsolate: number;
  }>(() => {
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
    }
  }, [apiCalled, setStore]);

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
    if (fetchedPendingActionsSummary && !endpointPendingActions) {
      setStore((prevState) => {
        return {
          ...prevState,
          endpointPendingActions: fetchedPendingActionsSummary,
        };
      });
    }
  }, [fetchedPendingActionsSummary, setStore, endpointPendingActions]);

  const getStatusDescriptionList = useCallback(() => {
    if (!endpointDetails) {
      return undefined;
    }

    const agentStatus = () => {
      let isolateStatus = '';

      if (pendingIsolationActions.pendingIsolate > 0) {
        isolateStatus = i18n.translate(
          'xpack.securitySolution.endpointResponseActions.status.isolating',
          {
            defaultMessage: 'Isolating',
          }
        );
      } else if (pendingIsolationActions.pendingUnIsolate > 0) {
        isolateStatus = i18n.translate(
          'xpack.securitySolution.endpointResponseActions.status.releasing',
          {
            defaultMessage: 'Releasing',
          }
        );
      } else if (endpointDetails?.metadata.Endpoint.state?.isolation) {
        isolateStatus = i18n.translate(
          'xpack.securitySolution.endpointResponseActions.status.isolated',
          {
            defaultMessage: 'Isolated',
          }
        );
      }

      return `${getAgentStatusText(endpointDetails.host_status)}${
        isolateStatus.length > 0 ? ` - ${isolateStatus}` : ''
      }`;
    };

    const statusData = [
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate('xpack.securitySolution.endpointResponseActions.status.agentStatus', {
              defaultMessage: 'Agent status',
            })}
          </ConsoleCodeBlock>
        ),
        description: <ConsoleCodeBlock>{agentStatus()}</ConsoleCodeBlock>,
      },
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate('xpack.securitySolution.endpointResponseActions.status.platform', {
              defaultMessage: 'Platform',
            })}
          </ConsoleCodeBlock>
        ),
        description: <ConsoleCodeBlock>{endpointDetails.metadata.host.os.full}</ConsoleCodeBlock>,
      },
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate('xpack.securitySolution.endpointResponseActions.status.version', {
              defaultMessage: 'Version',
            })}
          </ConsoleCodeBlock>
        ),
        description: endpointDetails.metadata.agent.version,
      },
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate('xpack.securitySolution.endpointResponseActions.status.policyStatus', {
              defaultMessage: 'Policy status',
            })}
          </ConsoleCodeBlock>
        ),
        description: (
          <ConsoleCodeBlock>
            {POLICY_STATUS_TO_TEXT[endpointDetails.metadata.Endpoint.policy.applied.status]}
          </ConsoleCodeBlock>
        ),
      },
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate(
              'xpack.securitySolution.endpointResponseActions.status.appliedPolicyVersion',
              {
                defaultMessage: 'Policy version',
              }
            )}
          </ConsoleCodeBlock>
        ),
        description: (
          <ConsoleCodeBlock>
            {`v${endpointDetails.metadata.Endpoint.policy.applied.endpoint_policy_version}`}
          </ConsoleCodeBlock>
        ),
      },
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate('xpack.securitySolution.endpointResponseActions.status.policyName', {
              defaultMessage: 'Policy name',
            })}
          </ConsoleCodeBlock>
        ),
        description: (
          <ConsoleCodeBlock>
            {endpointDetails.metadata.Endpoint.policy.applied.name}
          </ConsoleCodeBlock>
        ),
      },
      {
        title: (
          <ConsoleCodeBlock>
            {i18n.translate('xpack.securitySolution.endpointResponseActions.status.lastActive', {
              defaultMessage: 'Last active',
            })}
          </ConsoleCodeBlock>
        ),
        description: (
          <ConsoleCodeBlock>
            <FormattedDate
              fieldName={i18n.translate(
                'xpack.securitySolution.endpointResponseActions.status.lastActive',
                { defaultMessage: 'Last active' }
              )}
              value={endpointDetails.last_checkin}
            />
          </ConsoleCodeBlock>
        ),
      },
    ];
    return (
      <EuiDescriptionList
        compressed
        type="column"
        columnWidths={[1, 4]}
        listItems={statusData}
        data-test-subj={'agent-status-console-output'}
      />
    );
  }, [
    pendingIsolationActions.pendingIsolate,
    pendingIsolationActions.pendingUnIsolate,
    endpointDetails,
  ]);

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

  return <ResultComponent showTitle={false}>{getStatusDescriptionList()}</ResultComponent>;
});
EndpointStatusActionResult.displayName = 'EndpointStatusActionResult';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { useGetEndpointPendingActionsSummary } from '../../../../management/hooks/response_actions/use_get_endpoint_pending_actions_summary';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import type { DescriptionList } from '../../../../../common/utility_types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/field_renderers';
import * as i18n from './translations';
import type { EndpointFields } from '../../../../../common/search_strategy/security_solution/hosts';
import { HostPolicyResponseActionStatus } from '../../../../../common/search_strategy/security_solution/hosts';
import { AgentStatus } from '../../../../common/components/endpoint/agent_status';
import { EndpointHostIsolationStatus } from '../../../../common/components/endpoint/host_isolation';

interface Props {
  contextID?: string;
  data: EndpointFields | null;
}

export const EndpointOverview = React.memo<Props>(({ contextID, data }) => {
  const fleetAgentId = useMemo(() => data?.fleetAgentId?.toString(), [data]);
  const { data: endpointPendingActions } = useGetEndpointPendingActionsSummary(
    [fleetAgentId ?? ''],
    {
      queryKey: ['endpoint-agent-status', data?.fleetAgentId],
      enabled: !!fleetAgentId,
    }
  );
  const pendingActions = useMemo(() => {
    if (endpointPendingActions != null) {
      return endpointPendingActions.data[0].pending_actions;
    }
  }, [endpointPendingActions]);
  const getDefaultRenderer = useCallback(
    (fieldName: string, fieldData: EndpointFields, attrName: string) => (
      <DefaultFieldRenderer
        rowItems={[getOr('', fieldName, fieldData)]}
        attrName={attrName}
        idPrefix={contextID ? `endpoint-overview-${contextID}` : 'endpoint-overview'}
      />
    ),
    [contextID]
  );
  const descriptionLists: Readonly<DescriptionList[][]> = useMemo(
    () => [
      [
        {
          title: i18n.ENDPOINT_POLICY,
          description:
            data != null && data.endpointPolicy != null ? data.endpointPolicy : getEmptyTagValue(),
        },
      ],
      [
        {
          title: i18n.POLICY_STATUS,
          description:
            data != null && data.policyStatus != null ? (
              <EuiHealth
                aria-label={data.policyStatus}
                color={
                  data.policyStatus === HostPolicyResponseActionStatus.failure
                    ? 'danger'
                    : data.policyStatus
                }
              >
                {data.policyStatus}
              </EuiHealth>
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
      [
        {
          title: i18n.SENSORVERSION,
          description:
            data != null && data.sensorVersion != null
              ? getDefaultRenderer('sensorVersion', data, 'agent.version')
              : getEmptyTagValue(),
        },
      ],
      [
        {
          title: i18n.FLEET_AGENT_STATUS,
          description:
            data != null && data.elasticAgentStatus ? (
              <>
                <AgentStatus hostStatus={data.elasticAgentStatus} />
                <EndpointHostIsolationStatus
                  isIsolated={Boolean(data.isolation)}
                  pendingActions={{
                    pendingIsolate: pendingActions?.isolate ?? 0,
                    pendingUnIsolate: pendingActions?.unisolate ?? 0,
                    pendingKillProcess: pendingActions?.['kill-process'] ?? 0,
                    pendingSuspendProcess: pendingActions?.['suspend-process'] ?? 0,
                    pendingRunningProcesses: pendingActions?.['running-processes'] ?? 0,
                    pendingGetFile: pendingActions?.['get-file'] ?? 0,
                    pendingExecute: pendingActions?.execute ?? 0,
                  }}
                />
              </>
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
    ],
    [data, getDefaultRenderer, pendingActions]
  );

  return (
    <>
      {descriptionLists.map((descriptionList, index) => (
        <OverviewDescriptionList
          dataTestSubj="endpoint-overview"
          descriptionList={descriptionList}
          key={index}
        />
      ))}
    </>
  );
});

EndpointOverview.displayName = 'EndpointOverview';

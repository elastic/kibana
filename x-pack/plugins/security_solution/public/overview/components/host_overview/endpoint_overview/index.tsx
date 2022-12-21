/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

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
                    pendingIsolate: data.pendingActions?.isolate ?? 0,
                    pendingUnIsolate: data.pendingActions?.unisolate ?? 0,
                    pendingKillProcess: data.pendingActions?.['kill-process'] ?? 0,
                    pendingSuspendProcess: data.pendingActions?.['suspend-process'] ?? 0,
                    pendingRunningProcesses: data.pendingActions?.['running-processes'] ?? 0,
                  }}
                />
              </>
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
    ],
    [data, getDefaultRenderer]
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

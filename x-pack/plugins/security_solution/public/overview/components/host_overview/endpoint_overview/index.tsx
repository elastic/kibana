/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { AgentStatus } from '../../../../common/components/endpoint/agents/agent_status';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import type { DescriptionList } from '../../../../../common/utility_types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/field_renderers';
import * as i18n from './translations';
import type { EndpointFields } from '../../../../../common/search_strategy/security_solution/hosts';
import { HostPolicyResponseActionStatus } from '../../../../../common/search_strategy/security_solution/hosts';

interface Props {
  contextID?: string;
  data: EndpointFields | null;
  scopeId?: string;
}

export const EndpointOverview = React.memo<Props>(({ contextID, data, scopeId }) => {
  const getDefaultRenderer = useCallback(
    (fieldName: string, fieldData: EndpointFields, attrName: string) => (
      <DefaultFieldRenderer
        rowItems={[getOr('', fieldName, fieldData)]}
        attrName={attrName}
        idPrefix={contextID ? `endpoint-overview-${contextID}` : 'endpoint-overview'}
        scopeId={scopeId}
      />
    ),
    [contextID, scopeId]
  );
  const descriptionLists: Readonly<DescriptionList[][]> = useMemo(() => {
    const appliedPolicy = data?.hostInfo?.metadata.Endpoint.policy.applied;

    return [
      [
        {
          title: i18n.ENDPOINT_POLICY,
          description: appliedPolicy?.name ?? getEmptyTagValue(),
        },
      ],
      [
        {
          title: i18n.POLICY_STATUS,
          description: appliedPolicy?.status ? (
            <EuiHealth
              aria-label={appliedPolicy?.status}
              color={
                appliedPolicy?.status === HostPolicyResponseActionStatus.failure
                  ? 'danger'
                  : appliedPolicy?.status
              }
            >
              {appliedPolicy?.status}
            </EuiHealth>
          ) : (
            getEmptyTagValue()
          ),
        },
      ],
      [
        {
          title: i18n.SENSORVERSION,
          description: data?.hostInfo?.metadata.agent.version
            ? getDefaultRenderer('hostInfo.metadata.agent.version', data, 'agent.version')
            : getEmptyTagValue(),
        },
      ],
      [
        {
          title: i18n.FLEET_AGENT_STATUS,
          description:
            data != null && data.hostInfo ? (
              <AgentStatus agentId={data.hostInfo.metadata.agent.id} agentType="endpoint" />
            ) : (
              getEmptyTagValue()
            ),
        },
      ],
    ];
  }, [data, getDefaultRenderer]);

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLink,
  EuiHealth,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isPolicyOutOfDate } from '../../utils';
import { HostInfo, HostMetadata, HostStatus } from '../../../../../../common/endpoint/types';
import { useEndpointSelector } from '../hooks';
import { nonExistingPolicies, policyResponseStatus, uiQueryParams } from '../../store/selectors';
import { POLICY_STATUS_TO_BADGE_COLOR } from '../host_constants';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { EndpointPolicyLink } from '../../../../components/endpoint_policy_link';
import { OutOfDate } from '../components/out_of_date';
import { EndpointAgentStatus } from '../components/endpoint_agent_status';

const EndpointDetailsContentStyled = styled.div`
  dl dt {
    max-width: 27%;
  }
  dl dd {
    max-width: 73%;
  }
  .policyLineText {
    padding-right: 5px;
  }
`;

const ColumnTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiText size="s">
      <h5>{children}</h5>
    </EuiText>
  );
};

export const EndpointDetailsContent = memo(
  ({
    details,
    policyInfo,
    hostStatus,
  }: {
    details: HostMetadata;
    policyInfo?: HostInfo['policy_info'];
    hostStatus: HostStatus;
  }) => {
    const queryParams = useEndpointSelector(uiQueryParams);
    const policyStatus = useEndpointSelector(
      policyResponseStatus
    ) as keyof typeof POLICY_STATUS_TO_BADGE_COLOR;

    const missingPolicies = useEndpointSelector(nonExistingPolicies);

    const policyResponseRoutePath = useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { selected_endpoint, show, ...currentUrlParams } = queryParams;
      const path = getEndpointDetailsPath({
        name: 'endpointPolicyResponse',
        ...currentUrlParams,
        selected_endpoint: details.agent.id,
      });
      return path;
    }, [details.agent.id, queryParams]);

    const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseRoutePath);

    const detailsResults = useMemo(() => {
      return [
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.os"
                defaultMessage="OS"
              />
            </ColumnTitle>
          ),
          description: <EuiText size="xs">{details.host.os.full}</EuiText>,
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.agentStatus"
                defaultMessage="Agent Status"
              />
            </ColumnTitle>
          ),
          description: <EndpointAgentStatus hostStatus={hostStatus} endpointMetadata={details} />,
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.lastSeen"
                defaultMessage="Last Seen"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiText size="xs">
              <FormattedDate value={details['@timestamp']} fieldName="" />
            </EuiText>
          ),
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.policy"
                defaultMessage="Policy"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiText size="xs" className={'eui-textBreakWord'}>
              <EndpointPolicyLink
                policyId={details.Endpoint.policy.applied.id}
                data-test-subj="policyDetailsValue"
                className={'policyLineText'}
                missingPolicies={missingPolicies}
              >
                {details.Endpoint.policy.applied.name}
              </EndpointPolicyLink>
              {details.Endpoint.policy.applied.endpoint_policy_version && (
                <EuiText
                  color="subdued"
                  size="xs"
                  className={'eui-displayInlineBlock eui-textNoWrap policyLineText'}
                  data-test-subj="policyDetailsRevNo"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.details.policy.revisionNumber"
                    defaultMessage="rev. {revNumber}"
                    values={{
                      revNumber: details.Endpoint.policy.applied.endpoint_policy_version,
                    }}
                  />
                </EuiText>
              )}
              {isPolicyOutOfDate(details.Endpoint.policy.applied, policyInfo) && <OutOfDate />}
            </EuiText>
          ),
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.policyStatus"
                defaultMessage="Policy Status"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiHealth
              data-test-subj={`policyStatusValue-${policyStatus}`}
              color={POLICY_STATUS_TO_BADGE_COLOR[policyStatus] || 'default'}
            >
              <EuiLink onClick={policyStatusClickHandler} data-test-subj="policyStatusValue">
                <EuiText size="xs">
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.details.policyStatusValue"
                    defaultMessage="{policyStatus, select, success {Success} warning {Warning} failure {Failed} other {Unknown}}"
                    values={{ policyStatus }}
                  />
                </EuiText>
              </EuiLink>
            </EuiHealth>
          ),
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.endpointVersion"
                defaultMessage="Endpoint Version"
              />
            </ColumnTitle>
          ),
          description: <EuiText size="xs">{details.agent.version}</EuiText>,
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.ipAddress"
                defaultMessage="IP Address"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiFlexGroup direction="column" gutterSize="s">
              {details.host.ip.map((ip: string, index: number) => (
                <EuiFlexItem key={index}>
                  <EuiText size="xs">{ip}</EuiText>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ),
        },
      ];
    }, [details, hostStatus, policyStatus, policyStatusClickHandler, policyInfo, missingPolicies]);

    return (
      <EndpointDetailsContentStyled>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          compressed={true}
          type="column"
          listItems={detailsResults}
          data-test-subj="endpointDetailsList"
        />
      </EndpointDetailsContentStyled>
    );
  }
);

EndpointDetailsContent.displayName = 'EndpointDetailsContent';

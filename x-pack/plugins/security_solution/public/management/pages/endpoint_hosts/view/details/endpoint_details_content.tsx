/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import {
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiInMemoryTable,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isPolicyOutOfDate } from '../../utils';
import { HostInfo, HostMetadata, HostStatus } from '../../../../../../common/endpoint/types';
import { useEndpointSelector } from '../hooks';
import { policyResponseStatus, uiQueryParams } from '../../store/selectors';
import { POLICY_STATUS_TO_BADGE_COLOR } from '../host_constants';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { EndpointPolicyLink } from '../components/endpoint_policy_link';
import { OutOfDate } from '../components/out_of_date';
import { EndpointAgentStatus } from '../components/endpoint_agent_status';
import { useAppUrl } from '../../../../../common/lib/kibana/hooks';

const HostIds = styled(EuiListGroupItem)`
  margin-top: 0;
  .euiListGroupItem__text {
    padding: 0;
  }
`;

const StyledEuiInMemoryTable = styled.div`
  .euiTableHeaderCell,
  .euiTableRowCell {
    border: none;
  }
  .euiTableHeaderCell .euiTableCellContent {
    padding: 0;
  }

  .flyoutOverviewDescription {
    .hoverActions-active {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }

    &:hover {
      .timelines__hoverActionButton,
      .securitySolution__hoverActionButton {
        opacity: 1;
      }
    }
  }
`;
const StyledH5 = styled.h5`
  line-height: 1.7rem;
`;

const getTitle = (title: string) => (
  <EuiTitle size="xxxs">
    <StyledH5>{title}</StyledH5>
  </EuiTitle>
);

const getDescription = (description: React.ReactNode) => description;

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
    const { getAppUrl } = useAppUrl();

    const [policyResponseUri, policyResponseRoutePath] = useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { selected_endpoint, show, ...currentUrlParams } = queryParams;
      const path = getEndpointDetailsPath({
        name: 'endpointPolicyResponse',
        ...currentUrlParams,
        selected_endpoint: details.agent.id,
      });
      return [getAppUrl({ path }), path];
    }, [details.agent.id, getAppUrl, queryParams]);

    const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseRoutePath);

    const detailsResults = useMemo(() => {
      return [
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.os', {
            defaultMessage: 'OS',
          }),
          description: <EuiText size="xs">{details.host.os.full}</EuiText>,
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.agentStatus', {
            defaultMessage: 'Agent Status',
          }),
          description: <EndpointAgentStatus hostStatus={hostStatus} endpointMetadata={details} />,
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.lastSeen', {
            defaultMessage: 'Last Seen',
          }),
          description: (
            <EuiText size="xs">
              {' '}
              <FormattedDate value={details['@timestamp']} fieldName="" />
            </EuiText>
          ),
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.policy', {
            defaultMessage: 'Policy',
          }),
          description: (
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <EndpointPolicyLink
                    policyId={details.Endpoint.policy.applied.id}
                    data-test-subj="policyDetailsValue"
                  >
                    {details.Endpoint.policy.applied.name}
                  </EndpointPolicyLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="baseline">
                {details.Endpoint.policy.applied.endpoint_policy_version && (
                  <EuiFlexItem grow={false}>
                    <EuiText
                      color="subdued"
                      size="xs"
                      style={{ whiteSpace: 'nowrap' }}
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
                  </EuiFlexItem>
                )}
                {isPolicyOutOfDate(details.Endpoint.policy.applied, policyInfo) && (
                  <EuiFlexItem grow={false}>
                    <OutOfDate />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexGroup>
          ),
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.policyStatus', {
            defaultMessage: 'Policy Status',
          }),
          description: (
            // https://github.com/elastic/eui/issues/4530
            // @ts-ignore
            <EuiBadge
              color={POLICY_STATUS_TO_BADGE_COLOR[policyStatus] || 'default'}
              data-test-subj="policyStatusValue"
              href={policyResponseUri}
              onClick={policyStatusClickHandler}
              onClickAriaLabel={i18n.translate(
                'xpack.securitySolution.endpoint.details.policyStatus',
                { defaultMessage: 'Policy Status' }
              )}
            >
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.details.policyStatusValue"
                  defaultMessage="{policyStatus, select, success {Success} warning {Warning} failure {Failed} other {Unknown}}"
                  values={{ policyStatus }}
                />
              </EuiText>
            </EuiBadge>
          ),
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.endpointVersion', {
            defaultMessage: 'Endpoint Version',
          }),
          description: <EuiText size="xs">{details.agent.version}</EuiText>,
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.ipAddress', {
            defaultMessage: 'IP Address',
          }),
          description: (
            <EuiListGroup flush>
              {details.host.ip.map((ip: string, index: number) => (
                <HostIds size="xs" key={index} label={ip} />
              ))}
            </EuiListGroup>
          ),
        },
      ];
    }, [
      details,
      hostStatus,
      policyResponseUri,
      policyStatus,
      policyStatusClickHandler,
      policyInfo,
    ]);

    const columns = [
      {
        field: 'title',
        truncateText: false,
        render: getTitle,
        width: '220px',
        name: '',
      },
      {
        className: 'flyoutOverviewDescription',
        field: 'description',
        truncateText: false,
        name: '',
        render: getDescription,
      },
    ];

    return (
      <>
        <StyledEuiInMemoryTable>
          <EuiInMemoryTable<typeof detailsResults[0]>
            data-test-subj="endpointDetailsList"
            columns={columns}
            items={detailsResults}
            compressed
          />
        </StyledEuiInMemoryTable>
      </>
    );
  }
);

EndpointDetailsContent.displayName = 'EndpointDetailsContent';

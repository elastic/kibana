/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSpacer,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { isPolicyOutOfDate } from '../../utils';
import { HostInfo, HostMetadata, HostStatus } from '../../../../../../common/endpoint/types';
import { useEndpointSelector } from '../hooks';
import { policyResponseStatus, uiQueryParams } from '../../store/selectors';
import { POLICY_STATUS_TO_BADGE_COLOR } from '../host_constants';
import { FormattedDateAndTime } from '../../../../../common/components/endpoint/formatted_date_time';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { EndpointPolicyLink } from '../components/endpoint_policy_link';
import { OutOfDate } from '../components/out_of_date';
import { EndpointAgentStatus } from '../components/endpoint_agent_status';

const HostIds = styled(EuiListGroupItem)`
  margin-top: 0;
  .euiListGroupItem__text {
    padding: 0;
  }
`;

export const EndpointDetails = memo(
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
    const { formatUrl } = useFormatUrl(SecurityPageName.administration);

    const [policyResponseUri, policyResponseRoutePath] = useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { selected_endpoint, show, ...currentUrlParams } = queryParams;
      return [
        formatUrl(
          getEndpointDetailsPath({
            name: 'endpointPolicyResponse',
            ...currentUrlParams,
            selected_endpoint: details.agent.id,
          })
        ),
        getEndpointDetailsPath({
          name: 'endpointPolicyResponse',
          ...currentUrlParams,
          selected_endpoint: details.agent.id,
        }),
      ];
    }, [details.agent.id, formatUrl, queryParams]);

    const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseRoutePath);

    const detailsResults = useMemo(() => {
      return [
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.os', {
            defaultMessage: 'OS',
          }),
          description: <EuiText>{details.host.os.full}</EuiText>,
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
            <EuiText>
              {' '}
              <FormattedDateAndTime date={new Date(details['@timestamp'])} />
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
                <EuiText>
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
              <EuiText size="m">
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
          description: <EuiText>{details.agent.version}</EuiText>,
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.ipAddress', {
            defaultMessage: 'IP Address',
          }),
          description: (
            <EuiListGroup flush>
              <EuiText size="xs">
                {details.host.ip.map((ip: string, index: number) => (
                  <HostIds key={index} label={ip} />
                ))}
              </EuiText>
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

    return (
      <>
        <EuiSpacer size="l" />
        <EuiDescriptionList
          type="column"
          listItems={detailsResults}
          data-test-subj="endpointDetailsList"
        />
      </>
    );
  }
);

EndpointDetails.displayName = 'EndpointDetails';

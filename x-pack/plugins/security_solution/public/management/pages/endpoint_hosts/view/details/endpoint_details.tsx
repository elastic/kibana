/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiIcon,
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
import { useEndpointSelector, useAgentDetailsIngestUrl } from '../hooks';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { policyResponseStatus, uiQueryParams } from '../../store/selectors';
import { POLICY_STATUS_TO_BADGE_COLOR } from '../host_constants';
import { FormattedDateAndTime } from '../../../../../common/components/endpoint/formatted_date_time';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { AgentDetailsReassignPolicyAction } from '../../../../../../../fleet/public';
import { EndpointPolicyLink } from '../components/endpoint_policy_link';
import { OutOfDate } from '../components/out_of_date';
import { EndpointAgentStatus } from '../components/endpoint_agent_status';

const HostIds = styled(EuiListGroupItem)`
  margin-top: 0;
  .euiListGroupItem__text {
    padding: 0;
  }
`;

const openReassignFlyoutSearch = '?openReassignFlyout=true';

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
    const agentId = details.elastic.agent.id;
    const {
      url: agentDetailsUrl,
      appId: ingestAppId,
      appPath: agentDetailsAppPath,
    } = useAgentDetailsIngestUrl(agentId);
    const queryParams = useEndpointSelector(uiQueryParams);
    const policyStatus = useEndpointSelector(
      policyResponseStatus
    ) as keyof typeof POLICY_STATUS_TO_BADGE_COLOR;
    const { formatUrl } = useFormatUrl(SecurityPageName.administration);

    const detailsResultsUpper = useMemo(() => {
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
      ];
    }, [details, hostStatus]);

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

    const agentDetailsWithFlyoutPath = `${agentDetailsAppPath}${openReassignFlyoutSearch}`;
    const agentDetailsWithFlyoutUrl = `${agentDetailsUrl}${openReassignFlyoutSearch}`;
    const handleReassignEndpointsClick = useNavigateToAppEventHandler<AgentDetailsReassignPolicyAction>(
      ingestAppId,
      {
        path: agentDetailsWithFlyoutPath,
        state: {
          onDoneNavigateTo: [
            'securitySolution:administration',
            {
              path: getEndpointDetailsPath({
                name: 'endpointDetails',
                selected_endpoint: details.agent.id,
              }),
            },
          ],
        },
      }
    );

    const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseRoutePath);

    const detailsResultsPolicy = useMemo(() => {
      return [
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.policy', {
            defaultMessage: 'Integration Policy',
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
            defaultMessage: 'Policy Response',
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
                { defaultMessage: 'Policy Response' }
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
      ];
    }, [details, policyResponseUri, policyStatus, policyStatusClickHandler, policyInfo]);
    const detailsResultsLower = useMemo(() => {
      return [
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
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.hostname', {
            defaultMessage: 'Hostname',
          }),
          description: <EuiText className="eui-textBreakAll">{details.host.hostname}</EuiText>,
        },
        {
          title: i18n.translate('xpack.securitySolution.endpoint.details.endpointVersion', {
            defaultMessage: 'Endpoint Version',
          }),
          description: <EuiText>{details.agent.version}</EuiText>,
        },
      ];
    }, [details.agent.version, details.host.hostname, details.host.ip]);

    return (
      <>
        <EuiSpacer size="l" />
        <EuiDescriptionList
          type="column"
          listItems={detailsResultsUpper}
          data-test-subj="endpointDetailsUpperList"
        />
        <EuiHorizontalRule margin="m" />
        <EuiDescriptionList
          type="column"
          listItems={detailsResultsPolicy}
          data-test-subj="endpointDetailsPolicyList"
        />
        <EuiSpacer size="m" />
        <LinkToApp
          appId={ingestAppId}
          appPath={agentDetailsWithFlyoutPath}
          href={agentDetailsWithFlyoutUrl}
          onClick={handleReassignEndpointsClick}
          data-test-subj="endpointDetailsLinkToIngest"
        >
          <EuiFlexGroup
            direction="row"
            gutterSize="xs"
            justifyContent="flexStart"
            alignItems="center"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="managementApp" className="linkToAppIcon" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.details.linkToIngestTitle"
                  defaultMessage="Reassign Policy"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="popout" className="linkToAppPopoutIcon" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </LinkToApp>
        <EuiHorizontalRule margin="m" />
        <EuiDescriptionList
          type="column"
          listItems={detailsResultsLower}
          data-test-subj="endpointDetailsLowerList"
        />
      </>
    );
  }
);

EndpointDetails.displayName = 'EndpointDetails';

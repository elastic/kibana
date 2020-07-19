/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { HostMetadata } from '../../../../../../common/endpoint/types';
import { useHostSelector, useAgentDetailsIngestUrl } from '../hooks';
import { useNavigateToAppEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { policyResponseStatus, uiQueryParams } from '../../store/selectors';
import { POLICY_STATUS_TO_HEALTH_COLOR } from '../host_constants';
import { FormattedDateAndTime } from '../../../../../common/components/endpoint/formatted_date_time';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import { getHostDetailsPath, getPolicyDetailPath } from '../../../../common/routing';
import { SecurityPageName } from '../../../../../app/types';
import { useFormatUrl } from '../../../../../common/components/link_to';
import { AgentDetailsReassignConfigAction } from '../../../../../../../ingest_manager/public';

const HostIds = styled(EuiListGroupItem)`
  margin-top: 0;
  .euiListGroupItem__text {
    padding: 0;
  }
`;

const LinkToExternalApp = styled.div`
  margin-top: ${(props) => props.theme.eui.ruleMargins.marginMedium};
  .linkToAppIcon {
    margin-right: ${(props) => props.theme.eui.ruleMargins.marginXSmall};
  }
  .linkToAppPopoutIcon {
    margin-left: ${(props) => props.theme.eui.ruleMargins.marginXSmall};
  }
`;

const openReassignFlyoutSearch = '?openReassignFlyout=true';

export const HostDetails = memo(({ details }: { details: HostMetadata }) => {
  const agentId = details.elastic.agent.id;
  const {
    url: agentDetailsUrl,
    appId: ingestAppId,
    appPath: agentDetailsAppPath,
  } = useAgentDetailsIngestUrl(agentId);
  const queryParams = useHostSelector(uiQueryParams);
  const policyStatus = useHostSelector(
    policyResponseStatus
  ) as keyof typeof POLICY_STATUS_TO_HEALTH_COLOR;
  const { formatUrl } = useFormatUrl(SecurityPageName.administration);

  const detailsResultsUpper = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.os', {
          defaultMessage: 'OS',
        }),
        description: details.host.os.full,
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.lastSeen', {
          defaultMessage: 'Last Seen',
        }),
        description: <FormattedDateAndTime date={new Date(details['@timestamp'])} />,
      },
    ];
  }, [details]);

  const [policyResponseUri, policyResponseRoutePath] = useMemo(() => {
    const { selected_host, show, ...currentUrlParams } = queryParams;
    return [
      formatUrl(
        getHostDetailsPath({
          name: 'hostPolicyResponse',
          ...currentUrlParams,
          selected_host: details.host.id,
        })
      ),
      getHostDetailsPath({
        name: 'hostPolicyResponse',
        ...currentUrlParams,
        selected_host: details.host.id,
      }),
    ];
  }, [details.host.id, formatUrl, queryParams]);

  const agentDetailsWithFlyoutPath = `${agentDetailsAppPath}${openReassignFlyoutSearch}`;
  const agentDetailsWithFlyoutUrl = `${agentDetailsUrl}${openReassignFlyoutSearch}`;
  const handleReassignEndpointsClick = useNavigateToAppEventHandler<
    AgentDetailsReassignConfigAction
  >(ingestAppId, {
    path: agentDetailsWithFlyoutPath,
    state: {
      onDoneNavigateTo: [
        'securitySolution:administration',
        {
          path: getHostDetailsPath({ name: 'hostDetails', selected_host: details.host.id }),
        },
      ],
    },
  });

  const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseRoutePath);

  const [policyDetailsRoutePath, policyDetailsRouteUrl] = useMemo(() => {
    return [
      getPolicyDetailPath(details.Endpoint.policy.applied.id),
      formatUrl(getPolicyDetailPath(details.Endpoint.policy.applied.id)),
    ];
  }, [details.Endpoint.policy.applied.id, formatUrl]);

  const policyDetailsClickHandler = useNavigateByRouterEventHandler(policyDetailsRoutePath);

  const detailsResultsPolicy = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.policy', {
          defaultMessage: 'Policy',
        }),
        description: (
          <>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink
              data-test-subj="policyDetailsValue"
              href={policyDetailsRouteUrl}
              onClick={policyDetailsClickHandler}
            >
              {details.Endpoint.policy.applied.name}
            </EuiLink>
          </>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        description: (
          <EuiHealth
            color={POLICY_STATUS_TO_HEALTH_COLOR[policyStatus] || 'subdued'}
            data-test-subj="policyStatusHealth"
          >
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiLink
              data-test-subj="policyStatusValue"
              href={policyResponseUri}
              onClick={policyStatusClickHandler}
            >
              <EuiText size="m">
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.host.details.policyStatusValue"
                  defaultMessage="{policyStatus, select, success {Success} warning {Warning} failure {Failed} other {Unknown}}"
                  values={{ policyStatus }}
                />
              </EuiText>
            </EuiLink>
          </EuiHealth>
        ),
      },
    ];
  }, [
    details,
    policyResponseUri,
    policyStatus,
    policyStatusClickHandler,
    policyDetailsRouteUrl,
    policyDetailsClickHandler,
  ]);
  const detailsResultsLower = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.ipAddress', {
          defaultMessage: 'IP Address',
        }),
        description: (
          <EuiListGroup flush>
            {details.host.ip.map((ip: string, index: number) => (
              <HostIds key={index} label={ip} />
            ))}
          </EuiListGroup>
        ),
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.hostname', {
          defaultMessage: 'Hostname',
        }),
        description: details.host.hostname,
      },
      {
        title: i18n.translate('xpack.securitySolution.endpoint.host.details.endpointVersion', {
          defaultMessage: 'Endpoint Version',
        }),
        description: details.agent.version,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.agent.version, details.host.hostname, details.host.ip]);

  return (
    <>
      <EuiDescriptionList
        type="column"
        listItems={detailsResultsUpper}
        data-test-subj="hostDetailsUpperList"
      />
      <EuiHorizontalRule margin="m" />
      <EuiDescriptionList
        type="column"
        listItems={detailsResultsPolicy}
        data-test-subj="hostDetailsPolicyList"
      />
      <LinkToExternalApp>
        <LinkToApp
          appId={ingestAppId}
          appPath={agentDetailsWithFlyoutPath}
          href={agentDetailsWithFlyoutUrl}
          onClick={handleReassignEndpointsClick}
          data-test-subj="hostDetailsLinkToIngest"
        >
          <EuiIcon type="savedObjectsApp" className="linkToAppIcon" />
          <FormattedMessage
            id="xpack.securitySolution.endpoint.host.details.linkToIngestTitle"
            defaultMessage="Reassign Policy"
          />
          <EuiIcon type="popout" className="linkToAppPopoutIcon" />
        </LinkToApp>
      </LinkToExternalApp>
      <EuiHorizontalRule margin="m" />
      <EuiDescriptionList
        type="column"
        listItems={detailsResultsLower}
        data-test-subj="hostDetailsLowerList"
      />
    </>
  );
});

HostDetails.displayName = 'HostDetails';

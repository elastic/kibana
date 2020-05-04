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
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { HostMetadata, HostPolicyResponseActionStatus } from '../../../../../../common/types';
import { FormattedDateAndTime } from '../../formatted_date_time';
import { LinkToApp } from '../../components/link_to_app';
import { useHostSelector, useHostLogsUrl } from '../hooks';
import { urlFromQueryParams } from '../url_from_query_params';
import { policyResponseStatus, uiQueryParams } from '../../../store/hosts/selectors';
import { useNavigateByRouterEventHandler } from '../../hooks/use_navigate_by_router_event_handler';

const HostIds = styled(EuiListGroupItem)`
  margin-top: 0;
  .euiListGroupItem__text {
    padding: 0;
  }
`;

const POLICY_STATUS_TO_HEALTH_COLOR = Object.freeze<
  { [key in keyof typeof HostPolicyResponseActionStatus]: string }
>({
  success: 'success',
  warning: 'warning',
  failure: 'danger',
});

export const HostDetails = memo(({ details }: { details: HostMetadata }) => {
  const { appId, appPath, url } = useHostLogsUrl(details.host.id);
  const queryParams = useHostSelector(uiQueryParams);
  const policyStatus = useHostSelector(
    policyResponseStatus
  ) as keyof typeof POLICY_STATUS_TO_HEALTH_COLOR;
  const detailsResultsUpper = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.host.details.os', {
          defaultMessage: 'OS',
        }),
        description: details.host.os.full,
      },
      {
        title: i18n.translate('xpack.endpoint.host.details.lastSeen', {
          defaultMessage: 'Last Seen',
        }),
        description: <FormattedDateAndTime date={new Date(details['@timestamp'])} />,
      },
      {
        title: i18n.translate('xpack.endpoint.host.details.alerts', {
          defaultMessage: 'Alerts',
        }),
        description: '0',
      },
    ];
  }, [details]);

  const policyResponseUri = useMemo(() => {
    return urlFromQueryParams({
      ...queryParams,
      selected_host: details.host.id,
      show: 'policy_response',
    });
  }, [details.host.id, queryParams]);
  const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseUri);

  const detailsResultsLower = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.host.details.policy', {
          defaultMessage: 'Policy',
        }),
        description: details.endpoint.policy.id,
      },
      {
        title: i18n.translate('xpack.endpoint.host.details.policyStatus', {
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
              href={'?' + policyResponseUri.search}
              onClick={policyStatusClickHandler}
            >
              <FormattedMessage
                id="xpack.endpoint.host.details.policyStatusValue"
                defaultMessage="{policyStatus, select, success {Success} warning {Warning} failure {Failed} other {Unknown}}"
                values={{ policyStatus }}
              />
            </EuiLink>
          </EuiHealth>
        ),
      },
      {
        title: i18n.translate('xpack.endpoint.host.details.ipAddress', {
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
        title: i18n.translate('xpack.endpoint.host.details.hostname', {
          defaultMessage: 'Hostname',
        }),
        description: details.host.hostname,
      },
      {
        title: i18n.translate('xpack.endpoint.host.details.sensorVersion', {
          defaultMessage: 'Sensor Version',
        }),
        description: details.agent.version,
      },
    ];
  }, [
    details.agent.version,
    details.endpoint.policy.id,
    details.host.hostname,
    details.host.ip,
    policyResponseUri.search,
    policyStatusClickHandler,
    policyStatus,
  ]);

  return (
    <>
      <EuiDescriptionList
        type="column"
        listItems={detailsResultsUpper}
        data-test-subj="hostDetailsUpperList"
      />
      <EuiHorizontalRule margin="s" />
      <EuiDescriptionList
        type="column"
        listItems={detailsResultsLower}
        data-test-subj="hostDetailsLowerList"
      />
      <EuiHorizontalRule margin="s" />
      <p>
        <LinkToApp
          appId={appId}
          appPath={appPath}
          href={url}
          data-test-subj="hostDetailsLinkToLogs"
        >
          <FormattedMessage
            id="xpack.endpoint.host.details.linkToLogsTitle"
            defaultMessage="Endpoint Logs"
          />
        </LinkToApp>
      </p>
    </>
  );
});

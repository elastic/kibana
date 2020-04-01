/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, memo, useEffect } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiDescriptionList,
  EuiLoadingContent,
  EuiHorizontalRule,
  EuiHealth,
  EuiSpacer,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { HostMetadata } from '../../../../../common/types';
import { useHostListSelector } from './hooks';
import { urlFromQueryParams } from './url_from_query_params';
import { FormattedDateAndTime } from '../formatted_date_time';
import { uiQueryParams, detailsData, detailsError } from './../../store/hosts/selectors';

const HostIds = styled(EuiListGroupItem)`
  margin-top: 0;
  .euiListGroupItem__text {
    padding: 0;
  }
`;

const HostDetails = memo(({ details }: { details: HostMetadata }) => {
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
        description: <EuiHealth color="success">active</EuiHealth>,
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
  }, [details.agent.version, details.endpoint.policy.id, details.host.hostname, details.host.ip]);
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
    </>
  );
});

export const HostDetailsFlyout = () => {
  const history = useHistory();
  const { notifications } = useKibana();
  const queryParams = useHostListSelector(uiQueryParams);
  const { selected_host: selectedHost, ...queryParamsWithoutSelectedHost } = queryParams;
  const details = useHostListSelector(detailsData);
  const error = useHostListSelector(detailsError);

  const handleFlyoutClose = useCallback(() => {
    history.push(urlFromQueryParams(queryParamsWithoutSelectedHost));
  }, [history, queryParamsWithoutSelectedHost]);

  useEffect(() => {
    if (error !== undefined) {
      notifications.toasts.danger({
        title: (
          <FormattedMessage
            id="xpack.endpoint.host.details.errorTitle"
            defaultMessage="Could not find host"
          />
        ),
        body: (
          <FormattedMessage
            id="xpack.endpoint.host.details.errorBody"
            defaultMessage="Please exit the flyout and select an available host."
          />
        ),
        toastLifeTimeMs: 10000,
      });
    }
  }, [error, notifications.toasts]);

  return (
    <EuiFlyout onClose={handleFlyoutClose} data-test-subj="hostDetailsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 data-test-subj="hostDetailsFlyoutTitle">
            {details === undefined ? <EuiLoadingContent lines={1} /> : details.host.hostname}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {details === undefined ? (
          <>
            <EuiLoadingContent lines={3} /> <EuiSpacer size="l" /> <EuiLoadingContent lines={3} />
          </>
        ) : (
          <HostDetails details={details} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

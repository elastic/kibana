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
  EuiSpacer,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useManagementListSelector } from './hooks';
import { urlFromQueryParams } from './url_from_query_params';
import { uiQueryParams, detailsData, detailsError } from './../../store/managing/selectors';

const HostDetails = memo(({ details }: { details: ManagementListState }) => {
  const detailsResultsUpper = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.management.details.os', {
          defaultMessage: 'OS',
        }),
        description: details.host.os.full,
      },
      {
        title: i18n.translate('xpack.endpoint.management.details.lastSeen', {
          defaultMessage: 'Last Seen',
        }),
        description: <FormattedDate value={details['@timestamp']} />,
      },
      {
        title: i18n.translate('xpack.endpoint.management.details.alerts', {
          defaultMessage: 'Alerts',
        }),
        description: '0',
      },
    ];
  }, [details]);

  const detailsResultsLower = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.management.details.policy', {
          defaultMessage: 'Policy',
        }),
        description: details.endpoint.policy.id,
      },
      {
        title: i18n.translate('xpack.endpoint.management.details.policyStatus', {
          defaultMessage: 'Policy Status',
        }),
        description: 'active',
      },
      {
        title: i18n.translate('xpack.endpoint.management.details.ipAddress', {
          defaultMessage: 'IP Address',
        }),
        description: (
          <EuiListGroup flush>
            {details.host.ip.map((ip, index) => (
              <EuiListGroupItem key={index} label={ip} />
            ))}
          </EuiListGroup>
        ),
      },
      {
        title: i18n.translate('xpack.endpoint.management.details.hostname', {
          defaultMessage: 'Hostname',
        }),
        description: details.host.hostname,
      },
      {
        title: i18n.translate('xpack.endpoint.management.details.sensorVersion', {
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
        data-test-subj="managementDetailsUpperList"
      />
      <EuiHorizontalRule margin="s" />
      <EuiDescriptionList
        type="column"
        listItems={detailsResultsLower}
        data-test-subj="managementDetailsLowerList"
      />
    </>
  );
});

export const ManagementDetails = () => {
  const history = useHistory();
  const { notifications } = useKibana();
  const queryParams = useManagementListSelector(uiQueryParams);
  const { selected_host: selectedHost, ...queryParamsWithoutSelectedHost } = queryParams;
  const details = useManagementListSelector(detailsData);
  const error = useManagementListSelector(detailsError);

  const handleFlyoutClose = useCallback(() => {
    history.push(urlFromQueryParams(queryParamsWithoutSelectedHost));
  }, [history, queryParamsWithoutSelectedHost]);

  useEffect(() => {
    if (error !== undefined) {
      notifications.toasts.danger({
        title: (
          <FormattedMessage
            id="xpack.endpoint.managementDetails.errorTitle"
            defaultMessage="Could not find host"
          />
        ),
        body: (
          <FormattedMessage
            id="xpack.endpoint.managementDetails.errorBody"
            defaultMessage="Please exit the flyout and select an available host."
          />
        ),
        toastLifeTimeMs: 10000,
      });
    }
  }, [error, notifications.toasts]);

  return (
    <EuiFlyout onClose={handleFlyoutClose} data-test-subj="managementDetailsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 data-test-subj="managementDetailsTitle">
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

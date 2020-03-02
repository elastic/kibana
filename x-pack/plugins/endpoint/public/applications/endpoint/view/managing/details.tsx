/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiDescriptionList,
  EuiLoadingContent,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { useManagementListSelector } from './hooks';
import { urlFromQueryParams } from './url_from_query_params';
import { uiQueryParams, detailsData } from './../../store/managing/selectors';

const HostDetails = () => {
  const details = useManagementListSelector(detailsData);

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
        description: details['@timestamp'],
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
        description: details.host.ip,
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
};

export const ManagementDetails = () => {
  const history = useHistory();
  const queryParams = useManagementListSelector(uiQueryParams);
  const { selected_host: selectedHost, ...queryParamsWithoutSelectedHost } = queryParams;
  const details = useManagementListSelector(detailsData);

  const handleFlyoutClose = useCallback(() => {
    history.push(urlFromQueryParams(queryParamsWithoutSelectedHost));
  }, [history, queryParamsWithoutSelectedHost]);

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
          <HostDetails />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

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
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { useManagementListSelector } from './hooks';
import { urlFromQueryParams } from './url_from_query_params';
import { uiQueryParams, detailsData } from './../../store/managing/selectors';

const HostDetails = () => {
  const details = useManagementListSelector(detailsData);

  const detailsResultsUpper = useMemo(() => {
    return [
      {
        title: 'OS',
        description: details.host.os.full,
      },
      {
        title: 'Last Seen',
        description: details['@timestamp'],
      },
      {
        title: 'Alerts',
        description: '0',
      },
    ];
  }, [details]);

  const detailsResultsLower = useMemo(() => {
    return [
      {
        title: 'Policy',
        description: details.endpoint.policy.id,
      },
      {
        title: 'Policy Status',
        description: 'active',
      },
      {
        title: 'IP Address',
        description: details.host.ip,
      },
      {
        title: 'Hostname',
        description: details.host.hostname,
      },
      {
        title: 'Sensor Version',
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
            {details === undefined ? (
              <FormattedMessage
                id="xpack.endpoint.management.detailsLoadingTitle"
                defaultMessage="Details"
              />
            ) : (
              details.host.hostname
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {details === undefined ? <EuiLoadingContent lines={3} /> : <HostDetails />}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

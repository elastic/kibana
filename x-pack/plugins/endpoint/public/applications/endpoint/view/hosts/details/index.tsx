/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiLoadingContent,
  EuiSpacer,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useHostListSelector } from '../hooks';
import { urlFromQueryParams } from '../url_from_query_params';
import { uiQueryParams, detailsData, detailsError } from '../../../store/hosts/selectors';
import { HostDetails } from './host_details';

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
    <EuiFlyout onClose={handleFlyoutClose} data-test-subj="hostDetailsFlyout" size="s">
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

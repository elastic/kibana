/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { includes } from 'lodash';
import { IHttpFetchError, ResponseErrorBody } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { formatMsg } from '../../../../../../src/plugins/kibana_legacy/public';
import { toMountPoint, useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { MonitoringStartPluginDependencies } from '../../types';

export function formatMonitoringError(err: IHttpFetchError<ResponseErrorBody>) {
  if (err.response?.status && err.response?.status !== -1) {
    return (
      <EuiText>
        <p>{err.body?.message}</p>
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.monitoring.ajaxErrorHandler.httpErrorMessage"
            defaultMessage="HTTP {errStatus}"
            values={{ errStatus: err.response?.status }}
          />
        </EuiText>
      </EuiText>
    );
  }

  return formatMsg(err);
}

export const useRequestErrorHandler = () => {
  const { services } = useKibana<MonitoringStartPluginDependencies>();
  const history = useHistory();
  return useCallback(
    (err: IHttpFetchError<ResponseErrorBody>) => {
      if (err.response?.status === 403) {
        // redirect to error message view
        history.push('/access-denied');
      } else if (err.response?.status === 404 && !includes(window.location.hash, 'no-data')) {
        // pass through if this is a 404 and we're already on the no-data page
        const formattedError = formatMonitoringError(err);
        services.notifications?.toasts.addDanger({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.monitoring.ajaxErrorHandler.requestFailedNotificationTitle"
              defaultMessage="Monitoring Request Failed"
            />
          ),
          text: toMountPoint(
            <div>
              {formattedError}
              <EuiSpacer />
              <EuiButton size="s" color="danger" onClick={() => window.location.reload()}>
                <FormattedMessage
                  id="xpack.monitoring.ajaxErrorHandler.requestFailedNotification.retryButtonLabel"
                  defaultMessage="Retry"
                />
              </EuiButton>
            </div>
          ),
        });
      } else {
        services.notifications?.toasts.addDanger({
          title: toMountPoint(
            <FormattedMessage
              id="xpack.monitoring.ajaxErrorHandler.requestErrorNotificationTitle"
              defaultMessage="Monitoring Request Error"
            />
          ),
          text: toMountPoint(formatMonitoringError(err)),
        });
      }
    },
    [history, services.notifications?.toasts]
  );
};

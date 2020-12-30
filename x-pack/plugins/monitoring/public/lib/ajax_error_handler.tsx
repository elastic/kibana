/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { includes } from 'lodash';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Legacy } from '../legacy_shims';
import { formatMsg } from '../../../../../src/plugins/kibana_legacy/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

export function formatMonitoringError(err: any) {
  // TODO: We should stop using Boom for errors and instead write a custom handler to return richer error objects
  // then we can do better messages, such as highlighting the Cluster UUID instead of requiring it be part of the message
  if (err.status && err.status !== -1 && err.data) {
    return (
      <EuiText>
        <p>{err.data.message}</p>
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.monitoring.ajaxErrorHandler.httpErrorMessage"
            defaultMessage="HTTP {errStatus}"
            values={{ errStatus: err.status }}
          />
        </EuiText>
      </EuiText>
    );
  }

  return formatMsg(err);
}

export function ajaxErrorHandlersProvider() {
  return (err: any) => {
    if (err.status === 403) {
      // redirect to error message view
      history.replaceState(null, '', '#/access-denied');
    } else if (err.status === 404 && !includes(window.location.hash, 'no-data')) {
      // pass through if this is a 404 and we're already on the no-data page
      Legacy.shims.toastNotifications.addDanger({
        title: toMountPoint(
          <FormattedMessage
            id="xpack.monitoring.ajaxErrorHandler.requestFailedNotificationTitle"
            defaultMessage="Monitoring Request Failed"
          />
        ),
        text: toMountPoint(
          <div>
            {formatMonitoringError(err)}
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
      Legacy.shims.toastNotifications.addDanger({
        title: toMountPoint(
          <FormattedMessage
            id="xpack.monitoring.ajaxErrorHandler.requestErrorNotificationTitle"
            defaultMessage="Monitoring Request Error"
          />
        ),
        text: toMountPoint(formatMonitoringError(err)),
      });
    }

    return Promise.reject(err);
  };
}

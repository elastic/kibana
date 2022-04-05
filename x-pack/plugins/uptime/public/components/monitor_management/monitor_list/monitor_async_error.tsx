/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { monitorManagementListSelector } from '../../../state/selectors';

export const MonitorAsyncError = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const { list, locations } = useSelector(monitorManagementListSelector);
  const syncErrors = list.syncErrors;
  const hasSyncErrors = syncErrors && syncErrors.length > 0;

  return hasSyncErrors && !isDismissed ? (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorSync.failure.title"
            defaultMessage="Monitors failed to sync with the Synthetics service"
          />
        }
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.uptime.monitorManagement.monitorSync.failure.content"
            defaultMessage="There was a problem syncing your monitors for one or more locations:"
          />
        </p>
        <ul>
          {Object.values(syncErrors).map((e) => {
            return (
              <li key={e.locationId}>
                {`${
                  locations.find((location) => location.id === e.locationId)?.label
                } - ${STATUS_LABEL}: ${e.error.status}; ${REASON_LABEL}: ${e.error.reason}`}
              </li>
            );
          })}
        </ul>
        <EuiButton onClick={() => setIsDismissed(true)} color="warning">
          {DISMISS_LABEL}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
};

const REASON_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorSync.failure.reasonLabel',
  {
    defaultMessage: 'Reason',
  }
);

const STATUS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorSync.failure.statusLabel',
  {
    defaultMessage: 'Status',
  }
);

const DISMISS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorSync.failure.dismissLabel',
  {
    defaultMessage: 'Dismiss',
  }
);

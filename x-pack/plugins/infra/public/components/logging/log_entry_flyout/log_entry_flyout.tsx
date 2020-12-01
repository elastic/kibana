/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiProgress,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useEffect } from 'react';
import { TimeKey } from '../../../../common/time';
import { useLogEntry } from '../../../containers/logs/log_entry';
import { CenteredEuiFlyoutBody } from '../../centered_flyout_body';
import { LogEntryActionsMenu } from './log_entry_actions_menu';
import { LogEntryFieldsTable } from './log_entry_fields_table';

export interface LogEntryFlyoutProps {
  logEntryId: string | null | undefined;
  onCloseFlyout?: () => void;
  onSetFieldFilter?: (filter: string, logEntryId: string, timeKey?: TimeKey) => void;
  sourceId: string | null | undefined;
}

export const LogEntryFlyout = ({
  logEntryId,
  onCloseFlyout,
  onSetFieldFilter,
  sourceId,
}: LogEntryFlyoutProps) => {
  const {
    fetchLogEntry,
    isRequestRunning,
    logEntry,
    errors: logEntryErrors,
    total: logEntryRequestTotal,
    loaded: logEntryRequestProgress,
  } = useLogEntry({
    sourceId,
    logEntryId,
  });

  useEffect(() => {
    if (sourceId && logEntryId) {
      fetchLogEntry();
    }
  }, [fetchLogEntry, sourceId, logEntryId]);

  return (
    <EuiFlyout onClose={onCloseFlyout ?? noop} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="Details for log entry {logEntryId}"
                  id="xpack.infra.logFlyout.flyoutTitle"
                  values={{
                    logEntryId: logEntryId ? <code>{logEntryId}</code> : '',
                  }}
                />
              </h3>
            </EuiTitle>
            {logEntry ? (
              <>
                <EuiSpacer size="s" />
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.infra.logFlyout.flyoutSubTitle"
                    defaultMessage="From index {indexName}"
                    values={{
                      indexName: <code>{logEntry.index}</code>,
                    }}
                  />
                </EuiTextColor>
              </>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {logEntry ? <LogEntryActionsMenu logEntry={logEntry} /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      {isRequestRunning ? (
        <CenteredEuiFlyoutBody>
          {/* <EuiLoadingSpinner size="xl" /> */}
          <EuiProgress
            label={loadingProgressMessage}
            max={logEntryRequestTotal}
            value={logEntryRequestProgress}
          />
        </CenteredEuiFlyoutBody>
      ) : logEntry ? (
        <EuiFlyoutBody>
          <LogEntryFieldsTable logEntry={logEntry} onSetFieldFilter={onSetFieldFilter} />
        </EuiFlyoutBody>
      ) : (
        <CenteredEuiFlyoutBody>
          <EuiCallOut color="danger" iconType="alert">
            {`${logEntryErrors}`}
          </EuiCallOut>
        </CenteredEuiFlyoutBody>
      )}
    </EuiFlyout>
  );
};

const loadingProgressMessage = i18n.translate('xpack.infra.logFlyout.loadingMessage', {
  defaultMessage: 'Loading log entry',
});

const noop = () => {};

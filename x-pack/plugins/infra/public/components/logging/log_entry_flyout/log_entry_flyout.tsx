/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useEffect } from 'react';
import { euiStyled } from '../../../../../observability/public';
import { TimeKey } from '../../../../common/time';
import { useLogEntry } from '../../../containers/logs/log_entry';
import { InfraLoadingPanel } from '../../loading';
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
  const { fetchLogEntry, isRequestRunning, logEntry, errors: logEntryErrors } = useLogEntry({
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
                    logEntryId: flyoutItem ? <code>{flyoutItem.id}</code> : '',
                  }}
                />
              </h3>
            </EuiTitle>
            {flyoutItem ? (
              <>
                <EuiSpacer size="s" />
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.infra.logFlyout.flyoutSubTitle"
                    defaultMessage="From index {indexName}"
                    values={{
                      indexName: <code>{flyoutItem.index}</code>,
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
      <EuiFlyoutBody>
        {isRequestRunning ? (
          <InfraFlyoutLoadingPanel>
            <InfraLoadingPanel
              height="100%"
              width="100%"
              text={i18n.translate('xpack.infra.logFlyout.loadingMessage', {
                defaultMessage: 'Loading Event',
              })}
            />
          </InfraFlyoutLoadingPanel>
        ) : logEntry ? (
          <LogEntryFieldsTable logEntry={logEntry} onSetFieldFilter={onSetFieldFilter} />
        ) : (
          <div>{`${logEntryErrors}`}</div>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const InfraFlyoutLoadingPanel = euiStyled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

const noop = () => {};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Ping } from '../../../../common/runtime_types';
import { StdErrorPopover } from './stderr_logs_popover';

export const InlineError = ({ errorSummary }: { errorSummary: Ping }) => {
  const [isOpen, setIsOpen] = useState(false);

  const errorMessage =
    errorSummary.monitor.type === 'browser'
      ? getInlineErrorLabel(errorSummary.error?.message)
      : errorSummary.error?.message;

  return (
    <StdErrorPopover
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      checkGroup={errorSummary.monitor?.check_group!}
      summaryMessage={errorSummary.error?.message}
      button={
        <EuiToolTip content={errorMessage}>
          <EuiButtonIcon
            aria-label={errorMessage}
            iconType="alert"
            onClick={() => setIsOpen(true)}
            color="danger"
          />
        </EuiToolTip>
      }
    />
  );
};

export const getInlineErrorLabel = (message?: string) => {
  return i18n.translate('xpack.uptime.monitorList.statusColumn.error.message', {
    defaultMessage: '{message}. Click for more details.',
    values: { message },
  });
};

export const ERROR_LOGS_LABEL = i18n.translate('xpack.uptime.monitorList.statusColumn.error.logs', {
  defaultMessage: 'Error logs',
});

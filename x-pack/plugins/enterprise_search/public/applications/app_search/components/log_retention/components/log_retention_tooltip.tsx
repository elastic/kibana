/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LogRetentionLogic, LogRetentionMessage, LogRetentionOptions } from '..';
import { AppLogic } from '../../../app_logic';

interface Props {
  type: LogRetentionOptions;
  position?: 'top' | 'right' | 'bottom' | 'left';
}
export const LogRetentionTooltip: React.FC<Props> = ({ type, position = 'bottom' }) => {
  const { fetchLogRetention } = useActions(LogRetentionLogic);
  const { logRetention } = useValues(LogRetentionLogic);
  const {
    myRole: { canManageLogSettings },
  } = useValues(AppLogic);

  const hasLogRetention = logRetention !== null;

  useEffect(() => {
    if (!hasLogRetention && canManageLogSettings) fetchLogRetention();
  }, []);

  return hasLogRetention ? (
    <EuiIconTip
      aria-label={i18n.translate('xpack.enterpriseSearch.appSearch.logRetention.tooltip', {
        defaultMessage: 'Log retention info',
      })}
      size="l"
      type="iInCircle"
      color="primary"
      position={position}
      content={<LogRetentionMessage type={type} />}
    />
  ) : null;
};

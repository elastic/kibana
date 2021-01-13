/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';

import { LogRetentionLogic, LogRetentionMessage, LogRetentionOptions } from '../';

interface Props {
  type: LogRetentionOptions;
  position?: 'top' | 'right' | 'bottom' | 'left';
}
export const LogRetentionTooltip: React.FC<Props> = ({ type, position = 'bottom' }) => {
  const { logRetention } = useValues(LogRetentionLogic);
  const hasILM = logRetention !== null;

  return hasILM ? (
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

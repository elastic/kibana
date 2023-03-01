/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  isAutoRefreshing: boolean;
  dataTestSubj?: string;
  disabled?: boolean;
  onClick: () => void;
}

export function AutoRefreshButton({
  dataTestSubj = 'autoRefreshButton',
  disabled,
  isAutoRefreshing,
  onClick,
}: Props) {
  return isAutoRefreshing ? (
    <EuiButtonEmpty
      data-test-subj={dataTestSubj}
      disabled={disabled}
      iconSide="left"
      iconType="pause"
      onClick={onClick}
    >
      {i18n.translate('xpack.observability.slosPage.stopRefreshingButtonLabel', {
        defaultMessage: 'Stop refreshing',
      })}
    </EuiButtonEmpty>
  ) : (
    <EuiButtonEmpty
      data-test-subj={dataTestSubj}
      disabled={disabled}
      iconSide="left"
      iconType="play"
      onClick={onClick}
    >
      {i18n.translate('xpack.observability.slosPage.autoRefreshButtonLabel', {
        defaultMessage: 'Auto-refresh',
      })}
    </EuiButtonEmpty>
  );
}

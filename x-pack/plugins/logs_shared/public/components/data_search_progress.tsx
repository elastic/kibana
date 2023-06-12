/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

export const DataSearchProgress: React.FC<{
  label?: React.ReactNode;
  maxValue?: number;
  onCancel?: () => void;
  value?: number;
}> = ({ label, maxValue, onCancel, value }) => {
  const valueText = useMemo(
    () =>
      Number.isFinite(maxValue) && Number.isFinite(value) ? `${value} / ${maxValue}` : undefined,
    [value, maxValue]
  );

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiProgress label={label} size="s" max={maxValue} value={value} valueText={valueText} />
      </EuiFlexItem>
      {onCancel ? (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="cross"
            onClick={onCancel}
            title={cancelButtonLabel}
            aria-label={cancelButtonLabel}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

const cancelButtonLabel = i18n.translate('xpack.infra.dataSearch.cancelButtonLabel', {
  defaultMessage: 'Cancel request',
});

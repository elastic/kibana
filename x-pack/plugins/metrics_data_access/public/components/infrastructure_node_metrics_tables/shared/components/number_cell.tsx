/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiI18nNumber, EuiTextColor } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface NumberCellProps {
  value?: number;
  unit?: string;
}

export function NumberCell({ value, unit }: NumberCellProps) {
  if (value === null || value === undefined || isNaN(value)) {
    return (
      <EuiTextColor color="subdued">
        <FormattedMessage
          id="xpack.metricsData.metricsTable.numberCell.metricNotAvailableLabel"
          defaultMessage="N/A"
          description="N/A is short for not available"
        />
      </EuiTextColor>
    );
  }

  if (!unit) {
    return <EuiI18nNumber value={roundToOneDecimal(value)} />;
  }

  return (
    <span>
      <EuiI18nNumber value={roundToOneDecimal(value)} />
      {unit}
    </span>
  );
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { USE_BREAK_DOWN_COLUMN } from '../../configurations/constants';
import { useUrlStorage } from '../../hooks/use_url_storage';
import { DataSeries } from '../../types';

interface Props {
  seriesId: string;
  breakdowns: string[];
  reportViewConfig: DataSeries;
}

export function Breakdowns({ reportViewConfig, seriesId, breakdowns = [] }: Props) {
  const { setSeries, series } = useUrlStorage(seriesId);

  const selectedBreakdown = series.breakdown;
  const NO_BREAKDOWN = 'no_breakdown';

  const onOptionChange = (optionId: string) => {
    if (optionId === NO_BREAKDOWN) {
      setSeries(seriesId, {
        ...series,
        breakdown: undefined,
      });
    } else {
      setSeries(seriesId, {
        ...series,
        breakdown: selectedBreakdown === optionId ? undefined : optionId,
      });
    }
  };

  const hasUseBreakdownColumn = reportViewConfig.xAxisColumn.sourceField === USE_BREAK_DOWN_COLUMN;

  const items = breakdowns.map((breakdown) => ({
    id: breakdown,
    label: reportViewConfig.labels[breakdown],
  }));

  if (!hasUseBreakdownColumn) {
    items.push({
      id: NO_BREAKDOWN,
      label: i18n.translate('xpack.observability.exp.breakDownFilter.noBreakdown', {
        defaultMessage: 'No breakdown',
      }),
    });
  }

  const options = items.map(({ id, label }) => ({
    inputDisplay: id === NO_BREAKDOWN ? label : <strong>{label}</strong>,
    value: id,
    dropdownDisplay: label,
  }));

  const valueOfSelected =
    selectedBreakdown || (hasUseBreakdownColumn ? options[0].value : NO_BREAKDOWN);

  return (
    <div style={{ width: 200 }}>
      <EuiSuperSelect
        fullWidth
        compressed
        options={options}
        valueOfSelected={valueOfSelected}
        onChange={(value) => onOptionChange(value)}
        data-test-subj={'seriesBreakdown'}
      />
    </div>
  );
}

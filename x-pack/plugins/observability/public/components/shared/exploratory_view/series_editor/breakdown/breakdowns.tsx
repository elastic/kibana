/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import styled from 'styled-components';
import { EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import {
  LABEL_FIELDS_BREAKDOWN,
  USE_BREAK_DOWN_COLUMN,
  RECORDS_FIELD,
  PERCENTILE,
} from '../../configurations/constants';
import { SeriesConfig, SeriesUrl } from '../../types';
import { SYNTHETICS_STEP_NAME } from '../../configurations/constants/field_names/synthetics';
import { isStepLevelMetric } from '../../configurations/synthetics/kpi_over_time_config';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}

export function Breakdowns({ seriesConfig, seriesId, series }: Props) {
  const { setSeries, allSeries } = useSeriesStorage();

  const indexOfSeriesWithBreakdown = allSeries.findIndex((seriesT) => {
    return Boolean(seriesT.breakdown);
  });
  const currentSeriesHasBreakdown = indexOfSeriesWithBreakdown === seriesId;
  const anySeriesHasBreakdown = indexOfSeriesWithBreakdown !== -1;
  const differentSeriesHasBreakdown = anySeriesHasBreakdown && !currentSeriesHasBreakdown;

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

  useEffect(() => {
    if (
      !isStepLevelMetric(series.selectedMetricField) &&
      selectedBreakdown === SYNTHETICS_STEP_NAME
    ) {
      setSeries(seriesId, {
        ...series,
        breakdown: undefined,
      });
    }
  });

  if (!seriesConfig) {
    return null;
  }

  const hasUseBreakdownColumn = seriesConfig.xAxisColumn.sourceField === USE_BREAK_DOWN_COLUMN;
  const isRecordsMetric = series.selectedMetricField === RECORDS_FIELD;

  const items = seriesConfig.breakdownFields.map((breakdown) => ({
    id: breakdown,
    label: seriesConfig.labels[breakdown] ?? breakdown,
  }));

  if (!hasUseBreakdownColumn) {
    items.push({
      id: NO_BREAKDOWN,
      label: NO_BREAK_DOWN_LABEL,
    });
  }

  const options = items
    .map(({ id, label }) => {
      if (id === SYNTHETICS_STEP_NAME && !isStepLevelMetric(series.selectedMetricField)) {
        return {
          inputDisplay: label,
          value: id,
          dropdownDisplay: (
            <EuiToolTip content={BREAKDOWN_UNAVAILABLE}>
              <>{label}</>
            </EuiToolTip>
          ),
          disabled: true,
        };
      } else {
        return {
          inputDisplay: label,
          value: id,
          dropdownDisplay: label,
        };
      }
    })
    .filter(({ value }) => !(value === PERCENTILE && isRecordsMetric));

  let valueOfSelected =
    selectedBreakdown || (hasUseBreakdownColumn ? options[0].value : NO_BREAKDOWN);

  if (selectedBreakdown?.startsWith('labels.')) {
    valueOfSelected = LABEL_FIELDS_BREAKDOWN;
  }

  function Select() {
    return (
      <EuiSuperSelect
        options={options}
        valueOfSelected={valueOfSelected}
        onChange={(value) => onOptionChange(value)}
        data-test-subj={'seriesBreakdown'}
        disabled={differentSeriesHasBreakdown}
      />
    );
  }

  return (
    <Wrapper>
      {differentSeriesHasBreakdown ? (
        <EuiToolTip content={BREAKDOWN_WARNING} position="top">
          <Select />
        </EuiToolTip>
      ) : (
        <Select />
      )}
    </Wrapper>
  );
}

export const NO_BREAK_DOWN_LABEL = i18n.translate(
  'xpack.observability.exp.breakDownFilter.noBreakdown',
  {
    defaultMessage: 'No breakdown',
  }
);

export const BREAKDOWN_WARNING = i18n.translate('xpack.observability.exp.breakDownFilter.warning', {
  defaultMessage: 'Breakdowns can be applied to only one series at a time.',
});

export const BREAKDOWN_UNAVAILABLE = i18n.translate(
  'xpack.observability.exp.breakDownFilter.unavailable',
  {
    defaultMessage:
      'Step name breakdown is not available for monitor duration metric. Use step duration metric to breakdown by step name.',
  }
);

const Wrapper = styled.span`
  .euiToolTipAnchor {
    width: 100%;
  }
`;

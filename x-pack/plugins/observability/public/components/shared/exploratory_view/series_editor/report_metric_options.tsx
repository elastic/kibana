/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiToolTip,
  EuiPopover,
  EuiButton,
  EuiListGroup,
  EuiListGroupItem,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesConfig, SeriesUrl } from '../types';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { RECORDS_FIELD, RECORDS_PERCENTAGE_FIELD } from '../configurations/constants';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  defaultValue?: string;
  seriesConfig?: SeriesConfig;
}

export function ReportMetricOptions({ seriesId, series, seriesConfig }: Props) {
  const { setSeries } = useSeriesStorage();
  const [showOptions, setShowOptions] = useState(false);
  const metricOptions = seriesConfig?.metricOptions;

  const { indexPatterns } = useAppIndexPatternContext();

  const onChange = (value?: string) => {
    setSeries(seriesId, {
      ...series,
      selectedMetricField: value,
    });
  };

  if (!series.dataType) {
    return null;
  }

  const indexPattern = indexPatterns?.[series.dataType];

  const options = (metricOptions ?? []).map(({ label, field, id }) => {
    let disabled = false;

    if (field !== RECORDS_FIELD && field !== RECORDS_PERCENTAGE_FIELD && field) {
      disabled = !Boolean(indexPattern?.getFieldByName(field));
    }
    return {
      disabled,
      value: field || id,
      dropdownDisplay: disabled ? (
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.observability.expView.seriesEditor.selectReportMetric.noFieldData"
              defaultMessage="No data available for field {field}."
              values={{
                field: <strong>{field}</strong>,
              }}
            />
          }
        >
          <span>{label}</span>
        </EuiToolTip>
      ) : (
        label
      ),
      inputDisplay: label,
    };
  });

  return (
    <>
      {!series.selectedMetricField && (
        <EuiPopover
          button={
            <EuiButton
              iconType="plusInCircle"
              onClick={() => setShowOptions((prevState) => !prevState)}
              fill
              size="s"
            >
              {SELECT_REPORT_METRIC_LABEL}
            </EuiButton>
          }
          isOpen={showOptions}
          closePopover={() => setShowOptions((prevState) => !prevState)}
        >
          <EuiListGroup>
            {options.map((option) => (
              <EuiListGroupItem
                key={option.value}
                onClick={() => onChange(option.value)}
                label={option.dropdownDisplay}
                isDisabled={option.disabled}
              />
            ))}
          </EuiListGroup>
        </EuiPopover>
      )}
      {series.selectedMetricField && (
        <EuiBadge
          iconType="cross"
          iconSide="right"
          iconOnClick={() => onChange(undefined)}
          iconOnClickAriaLabel={REMOVE_REPORT_METRIC_LABEL}
        >
          {
            seriesConfig?.metricOptions?.find((option) => option.id === series.selectedMetricField)
              ?.label
          }
        </EuiBadge>
      )}
    </>
  );
}

const SELECT_REPORT_METRIC_LABEL = i18n.translate(
  'xpack.observability.expView.seriesEditor.selectReportMetric',
  {
    defaultMessage: 'Select report metric',
  }
);

const REMOVE_REPORT_METRIC_LABEL = i18n.translate(
  'xpack.observability.expView.seriesEditor.removeReportMetric',
  {
    defaultMessage: 'Remove report metric',
  }
);

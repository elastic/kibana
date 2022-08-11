/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { SeriesConfig, SeriesUrl } from '../../types';
import { useAppDataViewContext } from '../../hooks/use_app_data_view';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { LABEL_FIELDS_BREAKDOWN } from '../../configurations/constants';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}
export function LabelsBreakdown({ series, seriesId }: Props) {
  const { dataView } = useAppDataViewContext(series.dataType);

  const labelFields = dataView?.fields.filter((field) => field.name.startsWith('labels.'));

  const { setSeries } = useSeriesStorage();

  const { breakdown } = series;

  const hasLabelBreakdown =
    breakdown === LABEL_FIELDS_BREAKDOWN || breakdown?.startsWith('labels.');

  if (!hasLabelBreakdown) {
    return null;
  }

  const labelFieldOptions = labelFields?.map((field) => {
    return {
      label: field.name,
      value: field.name,
    };
  });

  return (
    <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
      <EuiComboBox
        selectedOptions={labelFieldOptions?.filter((labelField) => labelField.label === breakdown)}
        options={labelFieldOptions}
        placeholder={CHOOSE_BREAKDOWN_FIELD}
        onChange={(value) => {
          setSeries(seriesId, {
            ...series,
            breakdown: value?.[0]?.label ?? LABEL_FIELDS_BREAKDOWN,
          });
        }}
        singleSelection={{ asPlainText: true }}
        isInvalid={series.breakdown === LABEL_FIELDS_BREAKDOWN}
      />
    </EuiFlexItem>
  );
}

export const CHOOSE_BREAKDOWN_FIELD = i18n.translate(
  'xpack.observability.expView.seriesBuilder.labelField',
  {
    defaultMessage: 'Choose label field',
  }
);

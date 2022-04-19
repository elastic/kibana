/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSuperSelect } from '@elastic/eui';

import { OperationType } from '@kbn/lens-plugin/public';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesUrl } from '../../types';

export function OperationTypeSelect({
  seriesId,
  series,
  defaultOperationType,
}: {
  seriesId: number;
  series: SeriesUrl;
  defaultOperationType?: OperationType;
}) {
  const { setSeries } = useSeriesStorage();

  const operationType = series?.operationType;

  const onChange = (value: OperationType) => {
    setSeries(seriesId, { ...series, operationType: value });
  };

  return (
    <OperationTypeComponent
      onChange={onChange}
      operationType={operationType || defaultOperationType}
    />
  );
}

export function OperationTypeComponent({
  operationType,
  onChange,
}: {
  operationType?: OperationType;
  onChange: (value: OperationType) => void;
}) {
  const options = [
    {
      value: 'average' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.average', {
        defaultMessage: 'Average',
      }),
    },
    {
      value: 'median' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.median', {
        defaultMessage: 'Median',
      }),
    },
    {
      value: 'sum' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.sum', {
        defaultMessage: 'Sum',
      }),
    },
    {
      value: 'last_value' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.lastValue', {
        defaultMessage: 'Last value',
      }),
    },
    {
      value: '75th' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.75thPercentile', {
        defaultMessage: '75th Percentile',
      }),
    },
    {
      value: '90th' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.90thPercentile', {
        defaultMessage: '90th Percentile',
      }),
    },
    {
      value: '95th' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.95thPercentile', {
        defaultMessage: '95th Percentile',
      }),
    },
    {
      value: '99th' as OperationType,
      inputDisplay: i18n.translate('xpack.observability.expView.operationType.99thPercentile', {
        defaultMessage: '99th Percentile',
      }),
    },
  ];

  return (
    <EuiSuperSelect
      fullWidth
      data-test-subj="operationTypeSelect"
      valueOfSelected={operationType}
      options={options}
      onChange={onChange}
    />
  );
}

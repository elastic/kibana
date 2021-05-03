/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSuperSelect } from '@elastic/eui';

import { useUrlStorage } from '../../hooks/use_url_storage';
import { OperationType } from '../../../../../../../lens/public';

export function OperationTypeSelect({
  seriesId,
  defaultOperationType,
}: {
  seriesId: string;
  defaultOperationType?: OperationType;
}) {
  const { series, setSeries } = useUrlStorage(seriesId);

  const operationType = series?.operationType;

  const onChange = (value: OperationType) => {
    setSeries(seriesId, { ...series, operationType: value });
  };

  useEffect(() => {
    setSeries(seriesId, { ...series, operationType: operationType || defaultOperationType });
    // We only want to call this when defaultOperationType changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOperationType]);

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
      prepend={i18n.translate('xpack.observability.expView.operationType.label', {
        defaultMessage: 'Calculation',
      })}
      data-test-subj="operationTypeSelect"
      compressed
      valueOfSelected={operationType || defaultOperationType}
      options={options}
      onChange={onChange}
    />
  );
}

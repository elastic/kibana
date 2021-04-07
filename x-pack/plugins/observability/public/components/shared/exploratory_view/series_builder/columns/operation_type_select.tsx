/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
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
  }, [defaultOperationType, seriesId, operationType, setSeries, series]);

  const options = [
    {
      value: 'average' as OperationType,
      inputDisplay: 'Average',
    },
    {
      value: 'median' as OperationType,
      inputDisplay: 'Median',
    },
    {
      value: '75th' as OperationType,
      inputDisplay: '75th Percentile',
    },
    {
      value: '90th' as OperationType,
      inputDisplay: '90th Percentile',
    },
    {
      value: '95th' as OperationType,
      inputDisplay: '95th Percentile',
    },
    {
      value: '99th' as OperationType,
      inputDisplay: '99th Percentile',
    },
  ];

  return (
    <EuiSuperSelect
      compressed
      valueOfSelected={operationType || defaultOperationType}
      options={options}
      onChange={onChange}
    />
  );
}

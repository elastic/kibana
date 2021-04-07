/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';

import { useUrlStorage } from '../../hooks/use_url_storage';
import { OperationType } from '../../../../../../../lens/public';

export function OperationTypeSelect({ seriesId }: { seriesId: string }) {
  const { series, setSeries } = useUrlStorage(seriesId);

  const metricType = series?.metric;

  const onChange = (value: OperationType) => {
    setSeries(seriesId, { ...series, metric: value });
  };

  const options = [
    {
      value: 'average' as OperationType,
      inputDisplay: 'Average',
    },
    {
      value: 'average' as OperationType,
      inputDisplay: 'Average',
    },
  ];

  return <EuiSuperSelect valueOfSelected={metricType} options={options} onChange={onChange} />;
}

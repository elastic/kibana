/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { DataSeries } from '../../types';
import { useUrlStorage } from '../../hooks/use_url_strorage';

interface Props {
  series: DataSeries;
}

export const RemoveSeries = ({ series }: Props) => {
  const { removeSeries } = useUrlStorage();

  const onClick = () => {
    removeSeries(series.id);
  };
  return <EuiButtonIcon iconType="crossInACircleFilled" color="danger" onClick={onClick} />;
};

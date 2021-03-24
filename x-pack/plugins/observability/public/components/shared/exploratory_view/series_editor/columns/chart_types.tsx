/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useUrlStorage } from '../../hooks/use_url_strorage';
import { XYChartTypes } from '../../../../../../../lens/public';

export function SeriesChartTypes({
  seriesId,
  defaultChartType,
}: {
  seriesId: string;
  defaultChartType: string;
}) {
  const { series, setSeries, allSeries } = useUrlStorage(seriesId);

  const seriesType = series?.seriesType ?? defaultChartType;

  const onChange = (value: string) => {
    Object.keys(allSeries).forEach((seriesKey) => {
      const seriesN = allSeries[seriesKey];

      setSeries(seriesKey, { ...seriesN, seriesType: value });
    });
  };

  return (
    <XYChartTypes
      onChange={onChange}
      value={seriesType}
      excludeChartTypes={['bar_percentage_stacked']}
      label={'Chart types'}
    />
  );
}

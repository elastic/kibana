/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { DateRangePicker } from '../../components/date_range_picker';
import { SeriesDatePicker } from '../../components/series_date_picker';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: string;
  series: SeriesUrl;
}
export function DatePickerCol({ seriesId, series }: Props) {
  const { firstSeriesId, reportType } = useSeriesStorage();

  if (!series.dataType || !series.selectedMetricField) {
    return null;
  }

  return (
    <Wrapper>
      {firstSeriesId === seriesId || reportType !== 'kpi-over-time' ? (
        <SeriesDatePicker seriesId={seriesId} series={series} readonly={false} />
      ) : (
        <DateRangePicker seriesId={seriesId} series={series} />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  .euiSuperDatePicker__flexWrapper {
    width: 100%;
    > .euiFlexItem {
      margin-right: 0;
    }
  }
`;

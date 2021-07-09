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

interface Props {
  seriesId: string;
}
export function DatePickerCol({ seriesId }: Props) {
  const { firstSeriesId, reportType } = useSeriesStorage();

  return (
    <Wrapper>
      {firstSeriesId === seriesId || reportType !== 'kpi-over-time' ? (
        <SeriesDatePicker seriesId={seriesId} readonly={false} />
      ) : (
        <DateRangePicker seriesId={seriesId} />
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { SeriesDatePicker } from '../../series_date_picker';
import { DateRangePicker } from '../../series_date_picker/date_range_picker';
import { useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: string;
}
export function DatePickerCol({ seriesId }: Props) {
  const { firstSeriesId, getSeries } = useSeriesStorage();
  const { reportType } = getSeries(firstSeriesId);

  return (
    <Wrapper>
      {firstSeriesId === seriesId || reportType !== 'kpi-over-time' ? (
        <SeriesDatePicker seriesId={seriesId} />
      ) : (
        <DateRangePicker seriesId={seriesId} />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  .euiSuperDatePicker__flexWrapper {
    width: 100%;
    > .euiFlexItem {
      margin-right: 0px;
    }
  }
`;

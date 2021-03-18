/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SeriesFilter } from '../../series_editor/columns/series_filter';
import { NEW_SERIES_KEY } from '../../hooks/use_url_strorage';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { DatePickerCol } from '../../series_editor/columns/date_picker_col';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ReportViewTypeId } from '../../types';

interface Props {
  reportType: ReportViewTypeId;
}
export const ReportFilters = ({ reportType }: Props) => {
  const dataSeries = getDefaultConfigs({
    reportType: reportType!,
    seriesId: NEW_SERIES_KEY,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <DatePickerCol seriesId={NEW_SERIES_KEY} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SeriesFilter
          series={dataSeries}
          defaultFilters={dataSeries.defaultFilters}
          seriesId={NEW_SERIES_KEY}
          isNew={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

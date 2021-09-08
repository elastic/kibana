/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexItem, EuiFlexGroup, EuiPanel, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { BuilderItem } from '../types';
import { SeriesActions } from '../series_viewer/columns/series_actions';
import { SeriesInfo } from '../series_viewer/columns/series_info';
import { DataTypesSelect } from './columns/data_type_select';
import { DatePickerCol } from './columns/date_picker_col';
import { ExpandedSeriesRow } from './expanded_series_row';
import { SeriesName } from '../series_viewer/columns/series_name';
import { ReportMetricOptions } from './report_metric_options';
import { Breakdowns } from '../series_viewer/columns/breakdowns';

const StyledAccordion = styled(EuiAccordion)`
  .euiAccordion__button {
    width: auto;
    flex-grow: 0;
  }

  .euiAccordion__optionalAction {
    flex-grow: 1;
    flex-shrink: 1;
  }
`;

interface Props {
  item: BuilderItem;
  seriesId: number;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

export function Series({ item, seriesId, isExpanded, toggleExpanded }: Props) {
  const { series, seriesConfig } = item;

  return (
    <EuiPanel hasBorder={true}>
      <StyledAccordion
        id="stuff"
        forceState={isExpanded ? 'open' : 'closed'}
        onToggle={toggleExpanded}
        extraAction={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <SeriesInfo seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
            </EuiFlexItem>
            <EuiFlexItem>
              <SeriesName seriesId={seriesId} series={series} />
            </EuiFlexItem>
            <EuiFlexItem>
              <DataTypesSelect seriesId={seriesId} series={series} />
            </EuiFlexItem>
            <EuiFlexItem>
              <ReportMetricOptions
                series={series}
                seriesId={seriesId}
                metricOptions={seriesConfig?.metricOptions}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <DatePickerCol seriesId={seriesId} series={series} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Breakdowns seriesConfig={seriesConfig} seriesId={seriesId} series={series} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SeriesActions seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <ExpandedSeriesRow seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
      </StyledAccordion>
    </EuiPanel>
  );
}

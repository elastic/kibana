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
import { SeriesActions } from './columns/series_actions';
import { SeriesInfo } from './columns/series_info';
import { DataTypesSelect } from './columns/data_type_select';
import { DatePickerCol } from './columns/date_picker_col';
import { ExpandedSeriesRow } from './expanded_series_row';
import { SeriesName } from './columns/series_name';
import { ReportMetricOptions } from './report_metric_options';
import { Breakdowns } from './columns/breakdowns';

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
  isExpanded: boolean;
  toggleExpanded: () => void;
}

export function Series({ item, isExpanded, toggleExpanded }: Props) {
  const { id } = item;
  const seriesProps = {
    ...item,
    seriesId: id,
  };

  return (
    <EuiPanel hasBorder={true} data-test-subj={`exploratoryViewSeriesPanel${0}`}>
      <StyledAccordion
        id={`exploratoryViewSeriesAccordion${id}`}
        forceState={isExpanded ? 'open' : 'closed'}
        onToggle={toggleExpanded}
        arrowDisplay={
          !seriesProps.series.dataType || !seriesProps.series.selectedMetricField
            ? 'none'
            : undefined
        }
        extraAction={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <SeriesInfo {...seriesProps} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SeriesName {...seriesProps} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DataTypesSelect {...seriesProps} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ReportMetricOptions {...seriesProps} />
            </EuiFlexItem>
            <EuiFlexItem>
              <SeriesActions {...seriesProps} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <EuiPanel color="subdued">
          <ExpandedSeriesRow {...seriesProps} />
        </EuiPanel>
      </StyledAccordion>
    </EuiPanel>
  );
}

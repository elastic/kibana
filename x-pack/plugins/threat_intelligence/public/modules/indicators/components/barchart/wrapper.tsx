/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimeRange } from '@kbn/es-query';
import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { SecuritySolutionDataViewBase } from '../../../../types';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { IndicatorsFieldSelector } from './field_selector';
import { IndicatorsBarChart } from './barchart';
import { ChartSeries } from '../../services/fetch_aggregated_indicators';
import {
  BARCHART_WRAPPER_TEST_ID,
  CHART_UPDATE_PROGRESS_TEST_ID,
  LOADING_TEST_ID,
} from './test_ids';

const DEFAULT_FIELD = RawIndicatorFieldId.Feed;

export interface IndicatorsBarChartWrapperProps {
  /**
   * From and to values received from the KQL bar and passed down to the hook to query data.
   */
  timeRange?: TimeRange;
  /**
   * List of fields coming from the Security Solution sourcerer data view, passed down to the {@link IndicatorsFieldSelector} to populate the dropdown.
   */
  indexPattern: SecuritySolutionDataViewBase;

  series: ChartSeries[];

  dateRange: TimeRangeBounds;

  field: EuiComboBoxOptionOption<string>;

  onFieldChange: (value: EuiComboBoxOptionOption<string>) => void;

  /** Is initial load in progress? */
  isLoading?: boolean;

  /** Is data update in progress? */
  isFetching?: boolean;
}

/**
 * Displays the {@link IndicatorsBarChart} and {@link IndicatorsFieldSelector} components,
 * and handles retrieving aggregated indicator data.
 */
export const IndicatorsBarChartWrapper = memo<IndicatorsBarChartWrapperProps>(
  ({ timeRange, indexPattern, isLoading, isFetching, series, dateRange, field, onFieldChange }) => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} hasBorder={false} paddingSize="xl">
              <EuiLoadingSpinner data-test-subj={LOADING_TEST_ID} size="xl" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem>
            <EuiTitle size={'s'}>
              <h2>
                <FormattedMessage
                  id="xpack.threatIntelligence.indicator.barchartSection.title"
                  defaultMessage="Trend"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <IndicatorsFieldSelector
              indexPattern={indexPattern}
              defaultStackByValue={DEFAULT_FIELD}
              valueChange={onFieldChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {isFetching && (
          <EuiProgress
            data-test-subj={CHART_UPDATE_PROGRESS_TEST_ID}
            size="xs"
            color="accent"
            position="absolute"
          />
        )}

        {timeRange && (
          <div data-test-subj={BARCHART_WRAPPER_TEST_ID}>
            <IndicatorsBarChart indicators={series} dateRange={dateRange} field={field} />
          </div>
        )}
      </div>
    );
  }
);

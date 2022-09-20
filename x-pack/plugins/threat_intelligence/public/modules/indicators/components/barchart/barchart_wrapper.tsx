/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimeRange } from '@kbn/es-query';
import { SecuritySolutionDataViewBase } from '../../../../types';
import { RawIndicatorFieldId } from '../../../../../common/types/indicator';
import { useAggregatedIndicators } from './hooks/use_aggregated_indicators';
import { IndicatorFieldSelector } from './components/field_selector';
import { IndicatorBarChart } from './components/barchart';

const DEFAULT_FIELD = RawIndicatorFieldId.Feed;

export interface IndicatorBarChartWrapperProps {
  /**
   * From and to values received from the KQL bar and passed down to the hook to query data.
   */
  timeRange?: TimeRange;
  /**
   * List of fields coming from the Security Solution sourcerer data view, passed down to the {@link IndicatorFieldSelector} to populate the dropdown.
   */
  indexPattern: SecuritySolutionDataViewBase;
}

/**
 * Displays the {@link IndicatorBarChart} and {@link IndicatorFieldSelector} components,
 * and handles retrieving aggregated indicator data.
 */
export const IndicatorBarChartWrapper = memo<IndicatorBarChartWrapperProps>(
  ({ timeRange, indexPattern }) => {
    const { dateRange, indicators, selectedField, onFieldChange } = useAggregatedIndicators({
      timeRange,
    });

    return (
      <>
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
            <IndicatorFieldSelector
              indexPattern={indexPattern}
              defaultStackByValue={DEFAULT_FIELD}
              valueChange={onFieldChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {timeRange ? (
          <IndicatorBarChart indicators={indicators} dateRange={dateRange} field={selectedField} />
        ) : (
          <></>
        )}
      </>
    );
  }
);

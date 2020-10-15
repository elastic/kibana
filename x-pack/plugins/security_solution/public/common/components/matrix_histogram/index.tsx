/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Position } from '@elastic/charts';
import styled from 'styled-components';

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSelect, EuiSpacer } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import * as i18n from './translations';
import { BarChart } from '../charts/barchart';
import { HeaderSection } from '../header_section';
import { MatrixLoader } from './matrix_loader';
import { Panel } from '../panel';
import { getBarchartConfigs, getCustomChartData } from './utils';
import { useMatrixHistogram } from '../../containers/matrix_histogram';
import { MatrixHistogramProps, MatrixHistogramOption, MatrixHistogramQueryProps } from './types';
import { InspectButtonContainer } from '../inspect';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import {
  MatrixHistogramMappingTypes,
  GetTitle,
  GetSubTitle,
} from '../../components/matrix_histogram/types';
import { GlobalTimeArgs } from '../../containers/use_global_time';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';

export type MatrixHistogramComponentProps = MatrixHistogramProps &
  Omit<MatrixHistogramQueryProps, 'stackByField'> & {
    defaultStackByOption: MatrixHistogramOption;
    errorMessage: string;
    headerChildren?: React.ReactNode;
    hideHistogramIfEmpty?: boolean;
    histogramType: MatrixHistogramType;
    id: string;
    legendPosition?: Position;
    mapping?: MatrixHistogramMappingTypes;
    showSpacer?: boolean;
    setQuery: GlobalTimeArgs['setQuery'];
    setAbsoluteRangeDatePickerTarget?: InputsModelId;
    showLegend?: boolean;
    stackByOptions: MatrixHistogramOption[];
    subtitle?: string | GetSubTitle;
    timelineId?: string;
    title: string | GetTitle;
  };

const DEFAULT_PANEL_HEIGHT = 300;

const HeaderChildrenFlexItem = styled(EuiFlexItem)`
  margin-left: 24px;
`;

const HistogramPanel = styled(Panel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
`;

export const MatrixHistogramComponent: React.FC<MatrixHistogramComponentProps> = ({
  chartHeight,
  defaultStackByOption,
  endDate,
  errorMessage,
  filterQuery,
  headerChildren,
  histogramType,
  hideHistogramIfEmpty = false,
  id,
  indexNames,
  legendPosition,
  mapping,
  panelHeight = DEFAULT_PANEL_HEIGHT,
  setAbsoluteRangeDatePickerTarget = 'global',
  setQuery,
  showLegend,
  showSpacer = true,
  stackByOptions,
  startDate,
  subtitle,
  timelineId,
  title,
  titleSize,
  yTickFormatter,
}) => {
  const dispatch = useDispatch();
  const handleBrushEnd = useCallback(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      dispatch(
        setAbsoluteRangeDatePicker({
          id: setAbsoluteRangeDatePickerTarget,
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
        })
      );
    },
    [dispatch, setAbsoluteRangeDatePickerTarget]
  );
  const barchartConfigs = useMemo(
    () =>
      getBarchartConfigs({
        chartHeight,
        from: startDate,
        legendPosition,
        to: endDate,
        onBrushEnd: handleBrushEnd,
        yTickFormatter,
        showLegend,
      }),
    [chartHeight, startDate, legendPosition, endDate, handleBrushEnd, yTickFormatter, showLegend]
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedStackByOption, setSelectedStackByOption] = useState<MatrixHistogramOption>(
    defaultStackByOption
  );
  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? defaultStackByOption
      );
    },
    [defaultStackByOption, stackByOptions]
  );

  const [loading, { data, inspect, totalCount, refetch }] = useMatrixHistogram({
    endDate,
    errorMessage,
    filterQuery,
    histogramType,
    indexNames,
    startDate,
    stackByField: selectedStackByOption.value,
  });

  const titleWithStackByField = useMemo(
    () => (title != null && typeof title === 'function' ? title(selectedStackByOption) : title),
    [title, selectedStackByOption]
  );
  const subtitleWithCounts = useMemo(() => {
    if (isInitialLoading) {
      return null;
    }

    if (typeof subtitle === 'function') {
      return totalCount >= 0 ? subtitle(totalCount) : null;
    }

    return subtitle;
  }, [isInitialLoading, subtitle, totalCount]);
  const hideHistogram = useMemo(() => (totalCount <= 0 && hideHistogramIfEmpty ? true : false), [
    totalCount,
    hideHistogramIfEmpty,
  ]);
  const barChartData = useMemo(() => getCustomChartData(data, mapping), [data, mapping]);

  useEffect(() => {
    if (!loading && !isInitialLoading) {
      setQuery({ id, inspect, loading, refetch });
    }

    if (isInitialLoading && !!barChartData && data) {
      setIsInitialLoading(false);
    }
  }, [
    setQuery,
    id,
    inspect,
    loading,
    refetch,
    isInitialLoading,
    barChartData,
    data,
    setIsInitialLoading,
  ]);

  if (hideHistogram) {
    return null;
  }

  return (
    <>
      <InspectButtonContainer show={!isInitialLoading}>
        <HistogramPanel data-test-subj={`${id}Panel`} height={panelHeight}>
          {loading && !isInitialLoading && (
            <EuiProgress
              data-test-subj="initialLoadingPanelMatrixOverTime"
              size="xs"
              position="absolute"
              color="accent"
            />
          )}

          <HeaderSection
            id={id}
            title={titleWithStackByField}
            titleSize={titleSize}
            subtitle={subtitleWithCounts}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {stackByOptions.length > 1 && (
                  <EuiSelect
                    onChange={setSelectedChartOptionCallback}
                    options={stackByOptions}
                    prepend={i18n.STACK_BY}
                    value={selectedStackByOption?.value}
                  />
                )}
              </EuiFlexItem>
              <HeaderChildrenFlexItem grow={false}>{headerChildren}</HeaderChildrenFlexItem>
            </EuiFlexGroup>
          </HeaderSection>

          {isInitialLoading ? (
            <MatrixLoader />
          ) : (
            <BarChart
              barChart={barChartData}
              configs={barchartConfigs}
              stackByField={selectedStackByOption.value}
              timelineId={timelineId}
            />
          )}
        </HistogramPanel>
      </InspectButtonContainer>
      {showSpacer && <EuiSpacer data-test-subj="spacer" size="l" />}
    </>
  );
};

export const MatrixHistogram = React.memo(MatrixHistogramComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Position } from '@elastic/charts';
import styled from 'styled-components';

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSelect, EuiSpacer } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import * as i18n from './translations';
import { HeaderSection } from '../header_section';
import { Panel } from '../panel';
import { getBarchartConfigs, getCustomChartData } from './utils';
import { useMatrixHistogramCombined } from '../../containers/matrix_histogram';
import type {
  MatrixHistogramProps,
  MatrixHistogramOption,
  MatrixHistogramQueryProps,
  MatrixHistogramMappingTypes,
  GetTitle,
  GetSubTitle,
} from './types';
import type { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import type { GlobalTimeArgs } from '../../containers/use_global_time';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import { HoverVisibilityContainer } from '../hover_visibility_container';
import { VisualizationActions } from '../visualization_actions';
import type { GetLensAttributes, LensAttributes } from '../visualization_actions/types';
import { useQueryToggle } from '../../containers/query_toggle';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { VISUALIZATION_ACTIONS_BUTTON_CLASS } from '../visualization_actions/utils';
import { VisualizationEmbeddable } from '../visualization_actions/visualization_embeddable';
import { MatrixHistogramChartContent } from './chart_content';

export type MatrixHistogramComponentProps = MatrixHistogramProps &
  Omit<MatrixHistogramQueryProps, 'stackByField'> & {
    defaultStackByOption: MatrixHistogramOption;
    errorMessage: string;
    getLensAttributes?: GetLensAttributes;
    headerChildren?: React.ReactNode;
    hideHistogramIfEmpty?: boolean;
    histogramType: MatrixHistogramType;
    id: string;
    legendPosition?: Position;
    lensAttributes?: LensAttributes;
    mapping?: MatrixHistogramMappingTypes;
    onError?: () => void;
    showSpacer?: boolean;
    setQuery: GlobalTimeArgs['setQuery'];
    showInspectButton?: boolean;
    setAbsoluteRangeDatePickerTarget?: InputsModelId;
    showLegend?: boolean;
    stackByOptions: MatrixHistogramOption[];
    subtitle?: string | GetSubTitle;
    scopeId?: string;
    title: string | GetTitle;
    hideQueryToggle?: boolean;
  };

const DEFAULT_PANEL_HEIGHT = 300;

const HistogramPanel = styled(Panel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `min-height: ${height}px;` : '')}
`;

const CHART_HEIGHT = '150px';

export const MatrixHistogramComponent: React.FC<MatrixHistogramComponentProps> = ({
  chartHeight,
  defaultStackByOption,
  endDate,
  errorMessage,
  filterQuery,
  getLensAttributes,
  headerChildren,
  histogramType,
  hideHistogramIfEmpty = false,
  id,
  indexNames,
  runtimeMappings,
  isPtrIncluded,
  legendPosition,
  lensAttributes,
  mapping,
  onError,
  paddingSize = 'm',
  panelHeight = DEFAULT_PANEL_HEIGHT,
  setAbsoluteRangeDatePickerTarget = InputsModelId.global,
  setQuery,
  showInspectButton = false,
  showLegend,
  showSpacer = true,
  stackByOptions,
  startDate,
  subtitle,
  scopeId,
  title,
  titleSize,
  yTickFormatter,
  skip,
  hideQueryToggle = false,
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
  const [selectedStackByOption, setSelectedStackByOption] =
    useState<MatrixHistogramOption>(defaultStackByOption);

  useEffect(() => {
    setSelectedStackByOption(defaultStackByOption);
  }, [defaultStackByOption]);

  const setSelectedChartOptionCallback = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions.find((co) => co.value === event.target.value) ?? defaultStackByOption
      );
    },
    [defaultStackByOption, stackByOptions]
  );

  const { toggleStatus, setToggleStatus } = useQueryToggle(id);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(skip || !toggleStatus);
  }, [skip, toggleStatus]);
  const toggleQuery = useCallback(
    (status: boolean) => {
      setToggleStatus(status);
      // toggle on = skipQuery false
      setQuerySkip(!status);
    },
    [setQuerySkip, setToggleStatus]
  );

  const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');

  const matrixHistogramRequest = {
    endDate,
    errorMessage,
    filterQuery,
    histogramType,
    indexNames,
    onError,
    startDate,
    stackByField: selectedStackByOption.value,
    runtimeMappings,
    isPtrIncluded,
    skip: querySkip || isChartEmbeddablesEnabled,
  };
  const [loading, { data, inspect, totalCount, refetch }] =
    useMatrixHistogramCombined(matrixHistogramRequest);

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
  const hideHistogram = useMemo(
    () => (totalCount <= 0 && hideHistogramIfEmpty ? true : false),
    [totalCount, hideHistogramIfEmpty]
  );
  const barChartData = useMemo(() => getCustomChartData(data, mapping), [data, mapping]);

  useEffect(() => {
    if (!loading && !isInitialLoading) {
      setQuery({
        id,
        inspect,
        loading,
        refetch,
      });
    }

    if (isInitialLoading && !!barChartData && data) {
      setIsInitialLoading(false);
    }
  }, [
    barChartData,
    data,
    id,
    inspect,
    isChartEmbeddablesEnabled,
    isInitialLoading,
    loading,
    refetch,
    setIsInitialLoading,
    setQuery,
  ]);

  const timerange = useMemo(() => ({ from: startDate, to: endDate }), [startDate, endDate]);
  if (hideHistogram) {
    return null;
  }

  return (
    <>
      <HoverVisibilityContainer
        show={!isInitialLoading}
        targetClassNames={[VISUALIZATION_ACTIONS_BUTTON_CLASS]}
      >
        <HistogramPanel
          data-test-subj={`${id}Panel`}
          height={toggleStatus ? panelHeight : undefined}
          paddingSize={paddingSize}
        >
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
            height={toggleStatus ? undefined : 0}
            title={titleWithStackByField}
            titleSize={titleSize}
            toggleStatus={toggleStatus}
            toggleQuery={hideQueryToggle ? undefined : toggleQuery}
            subtitle={subtitleWithCounts}
            inspectMultiple
            showInspectButton={showInspectButton && !isChartEmbeddablesEnabled}
            isInspectDisabled={filterQuery === undefined}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              {(getLensAttributes || lensAttributes) && timerange && (
                <EuiFlexItem grow={false}>
                  <VisualizationActions
                    className="histogram-viz-actions"
                    getLensAttributes={getLensAttributes}
                    isInspectButtonDisabled={filterQuery === undefined}
                    lensAttributes={lensAttributes}
                    queryId={id}
                    stackByField={selectedStackByOption.value}
                    timerange={timerange}
                    title={title}
                  />
                </EuiFlexItem>
              )}
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
              <EuiFlexItem grow={false}>{headerChildren}</EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          {toggleStatus ? (
            isChartEmbeddablesEnabled && (getLensAttributes || lensAttributes) && timerange ? (
              <VisualizationEmbeddable
                data-test-subj="embeddable-matrix-histogram"
                getLensAttributes={getLensAttributes}
                height={CHART_HEIGHT}
                id={`${id}-embeddable`}
                inspectTitle={title as string}
                stackByField={selectedStackByOption.value}
                timerange={timerange}
              />
            ) : (
              <MatrixHistogramChartContent
                isInitialLoading={isInitialLoading}
                barChart={barChartData}
                configs={barchartConfigs}
                stackByField={selectedStackByOption.value}
                scopeId={scopeId}
              />
            )
          ) : null}
        </HistogramPanel>
      </HoverVisibilityContainer>
      {showSpacer && <EuiSpacer data-test-subj="spacer" size="l" />}
    </>
  );
};

export const MatrixHistogram = React.memo(MatrixHistogramComponent);

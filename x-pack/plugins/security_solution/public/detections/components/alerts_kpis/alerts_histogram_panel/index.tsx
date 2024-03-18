/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { Position } from '@elastic/charts';
import type { EuiComboBox, EuiTitleSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty, noop } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import { sumBy } from 'lodash';

import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { APP_UI_ID } from '../../../../../common/constants';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import type { LegendItem } from '../../../../common/components/charts/draggable_legend_item';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../containers/detection_engine/alerts/constants';
import { getDetectionEngineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { defaultLegendColors } from '../../../../common/components/matrix_histogram/utils';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { MatrixLoader } from '../../../../common/components/matrix_histogram/matrix_loader';
import { useKibana } from '../../../../common/lib/kibana';
import {
  parseCombinedQueries,
  buildCombinedQueries,
  formatAlertsData,
  getAlertsHistogramQuery,
  showInitialLoadingSpinner,
  createGenericSubtitle,
  createEmbeddedDataSubtitle,
} from './helpers';
import { AlertsHistogram } from './alerts_histogram';
import * as i18n from './translations';
import type { AlertsAggregation, AlertsTotal } from './types';
import { LinkButton } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../app/types';
import { DEFAULT_STACK_BY_FIELD, PANEL_HEIGHT } from '../common/config';
import type { AlertsStackByField } from '../common/types';
import { KpiPanel, StackByComboBox } from '../common/components';

import { useInspectButton } from '../common/hooks';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { GROUP_BY_TOP_LABEL } from '../common/translations';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getAlertsHistogramLensAttributes as getLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_histogram';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useAlertHistogramCount } from '../../../hooks/alerts_visualization/use_alert_histogram_count';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';

const defaultTotalAlertsObj: AlertsTotal = {
  value: 0,
  relation: 'eq',
};

export const DETECTIONS_HISTOGRAM_ID = 'detections-histogram';

const ViewAlertsFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeL};
`;

const OptionsFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export const LEGEND_WITH_COUNTS_WIDTH = 300; // px

const CHART_HEIGHT = 155; // px

interface AlertsHistogramPanelProps {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  chartHeight?: number;
  chartOptionsContextMenu?: (queryId: string) => React.ReactNode;
  combinedQueries?: string;
  comboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  defaultStackByOption?: string;
  extraActions?: Action[];
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  inspectTitle?: React.ReactNode;
  legendPosition?: Position;
  onFieldSelected?: (field: string) => void;
  /** Override all defaults, and only display this field */
  onlyField?: AlertsStackByField;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  panelHeight?: number;
  query?: Query;
  runtimeMappings?: MappingRuntimeFields;
  setComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  showCountsInLegend?: boolean;
  showGroupByPlaceholder?: boolean;
  showLegend?: boolean;
  showLinkToAlerts?: boolean;
  showStackBy?: boolean;
  showTotalAlertsCount?: boolean;
  signalIndexName: string | null;
  stackByLabel?: string;
  stackByWidth?: number;
  timelineId?: string;
  title?: React.ReactNode;
  titleSize?: EuiTitleSize;
  updateDateRange: UpdateDateRange;
  hideQueryToggle?: boolean;
  isExpanded?: boolean;
  setIsExpanded?: (status: boolean) => void;
}

const NO_LEGEND_DATA: LegendItem[] = [];

export const AlertsHistogramPanel = memo<AlertsHistogramPanelProps>(
  ({
    alignHeader,
    chartHeight = CHART_HEIGHT,
    chartOptionsContextMenu,
    combinedQueries,
    comboboxRef,
    defaultStackByOption = DEFAULT_STACK_BY_FIELD,
    extraActions,
    filters,
    headerChildren,
    inspectTitle,
    legendPosition = 'right',
    onFieldSelected,
    onlyField,
    paddingSize = 'm',
    panelHeight = PANEL_HEIGHT,
    query,
    runtimeMappings,
    setComboboxInputRef,
    showCountsInLegend = false,
    showGroupByPlaceholder = false,
    showLegend = true,
    showLinkToAlerts = false,
    showStackBy = true,
    showTotalAlertsCount = false,
    signalIndexName,
    stackByLabel,
    stackByWidth,
    timelineId,
    title = i18n.HISTOGRAM_HEADER,
    titleSize = 'm',
    updateDateRange,
    hideQueryToggle = false,
    isExpanded,
    setIsExpanded,
  }) => {
    const { to, from, deleteQuery, setQuery } = useGlobalTime();

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_HISTOGRAM_ID}-${uuidv4()}`, []);
    const visualizationId = `alerts-trend-embeddable-${uniqueQueryId}`;
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isInspectDisabled, setIsInspectDisabled] = useState(false);
    const [totalAlertsObj, setTotalAlertsObj] = useState<AlertsTotal>(defaultTotalAlertsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<string>(
      onlyField == null ? defaultStackByOption : onlyField
    );
    const isChartEmbeddablesEnabled = useIsExperimentalFeatureEnabled('chartEmbeddablesEnabled');
    const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');

    const onSelect = useCallback(
      (field: string) => {
        setSelectedStackByOption(field);
        if (onFieldSelected != null) {
          onFieldSelected(field);
        }
      },
      [onFieldSelected]
    );

    useEffect(() => {
      setSelectedStackByOption(onlyField == null ? defaultStackByOption : onlyField);
    }, [defaultStackByOption, onlyField]);

    const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_HISTOGRAM_ID);

    const toggleQuery = useCallback(
      (newToggleStatus: boolean) => {
        if (isAlertsPageChartsEnabled && setIsExpanded !== undefined) {
          setIsExpanded(newToggleStatus);
        } else {
          setToggleStatus(newToggleStatus);
        }
      },
      [setToggleStatus, setIsExpanded, isAlertsPageChartsEnabled]
    );

    const querySkip = useMemo(
      () =>
        isAlertsPageChartsEnabled && setIsExpanded !== undefined ? !isExpanded : !toggleStatus,
      [isAlertsPageChartsEnabled, setIsExpanded, isExpanded, toggleStatus]
    );

    const timerange = useMemo(() => ({ from, to }), [from, to]);

    const {
      loading: isLoadingAlerts,
      data: alertsData,
      setQuery: setAlertsQuery,
      response,
      request,
      refetch,
    } = useQueryAlerts<{}, AlertsAggregation>({
      query: getAlertsHistogramQuery(
        selectedStackByOption,
        from,
        to,
        buildCombinedQueries(combinedQueries),
        runtimeMappings
      ),
      indexName: signalIndexName,
      skip: querySkip || isChartEmbeddablesEnabled,
      queryName: ALERTS_QUERY_NAMES.HISTOGRAM,
    });

    const kibana = useKibana();
    const { navigateToApp } = kibana.services.application;
    const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.alerts);

    const totalAlerts = useAlertHistogramCount({
      totalAlertsObj,
      visualizationId,
      isChartEmbeddablesEnabled,
    });

    const goToDetectionEngine = useCallback(
      (ev) => {
        ev.preventDefault();
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.alerts,
          path: getDetectionEngineUrl(urlSearch),
        });
      },
      [navigateToApp, urlSearch]
    );
    const formattedAlertsData = useMemo(() => formatAlertsData(alertsData), [alertsData]);

    const legendItems: LegendItem[] = useMemo(
      () =>
        showLegend && alertsData?.aggregations?.alertsByGrouping?.buckets != null
          ? alertsData.aggregations.alertsByGrouping.buckets.map((bucket, i) => ({
              color: i < defaultLegendColors.length ? defaultLegendColors[i] : undefined,
              count: showCountsInLegend ? bucket.doc_count : undefined,
              dataProviderId: escapeDataProviderId(
                `draggable-legend-item-${uuidv4()}-${selectedStackByOption}-${bucket.key}`
              ),
              field: selectedStackByOption,
              timelineId,
              value: bucket?.key_as_string ?? bucket.key,
            }))
          : NO_LEGEND_DATA,
      [
        alertsData?.aggregations?.alertsByGrouping.buckets,
        selectedStackByOption,
        showCountsInLegend,
        showLegend,
        timelineId,
      ]
    );

    useEffect(() => {
      let canceled = false;
      if (!canceled && !showInitialLoadingSpinner({ isInitialLoading, isLoadingAlerts })) {
        setIsInitialLoading(false);
      }

      return () => {
        canceled = true; // prevent long running data fetches from updating state after unmounting
      };
    }, [isInitialLoading, isLoadingAlerts, setIsInitialLoading]);

    useInspectButton({
      deleteQuery,
      loading: isLoadingAlerts,
      refetch,
      request,
      response,
      setQuery,
      uniqueQueryId,
    });

    useEffect(() => {
      setTotalAlertsObj(
        alertsData?.hits.total ?? {
          value: 0,
          relation: 'eq',
        }
      );
    }, [alertsData]);

    useEffect(() => {
      try {
        let converted = null;
        if (combinedQueries != null) {
          converted = parseCombinedQueries(combinedQueries);
        } else {
          converted = buildEsQuery(
            undefined,
            query != null ? [query] : [],
            filters?.filter((f) => f.meta.disabled === false) ?? [],
            {
              ...getEsQueryConfig(kibana.services.uiSettings),
              dateFormatTZ: undefined,
            }
          );
        }
        setIsInspectDisabled(false);
        setAlertsQuery(
          getAlertsHistogramQuery(
            selectedStackByOption,
            from,
            to,
            !isEmpty(converted) ? [converted] : [],
            runtimeMappings
          )
        );
      } catch (e) {
        setIsInspectDisabled(true);
        setAlertsQuery(
          getAlertsHistogramQuery(selectedStackByOption, from, to, [], runtimeMappings)
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStackByOption, from, to, query, filters, combinedQueries, runtimeMappings]);

    const linkButton = useMemo(() => {
      if (showLinkToAlerts) {
        return (
          <ViewAlertsFlexItem grow={false}>
            <LinkButton
              data-test-subj="alerts-histogram-panel-go-to-alerts-page"
              onClick={goToDetectionEngine}
              href={formatUrl(getDetectionEngineUrl())}
            >
              {i18n.VIEW_ALERTS}
            </LinkButton>
          </ViewAlertsFlexItem>
        );
      }
    }, [showLinkToAlerts, goToDetectionEngine, formatUrl]);

    const titleText = useMemo(
      () => (onlyField == null ? title : i18n.TOP(onlyField)),
      [onlyField, title]
    );

    const showHistogram = useMemo(() => {
      if (isAlertsPageChartsEnabled) {
        if (isExpanded !== undefined) {
          // alerts page
          return isExpanded;
        } else {
          // rule details page and overview page
          return toggleStatus;
        }
      } else {
        return toggleStatus;
      }
    }, [isAlertsPageChartsEnabled, isExpanded, toggleStatus]);

    const { responses, loading } = useVisualizationResponse({
      visualizationId,
    });
    const embeddedDataLoaded = !loading && !isEmpty(responses);
    const aggregationBucketsCount = useMemo(
      () =>
        loading
          ? 0
          : sumBy(responses, (responseItem) =>
              sumBy(Object.values(responseItem.aggregations ?? {}), 'buckets.length')
            ),
      [loading, responses]
    );

    const embeddedDataAvailable = !!aggregationBucketsCount;
    const showsEmbeddedData = showHistogram && isChartEmbeddablesEnabled;

    const subtitle = showsEmbeddedData
      ? createEmbeddedDataSubtitle(embeddedDataLoaded, embeddedDataAvailable, totalAlerts)
      : createGenericSubtitle(isInitialLoading, showTotalAlertsCount, totalAlerts);

    return (
      <InspectButtonContainer show={!isInitialLoading && showHistogram}>
        <KpiPanel
          height={panelHeight}
          hasBorder
          paddingSize={paddingSize}
          data-test-subj="alerts-histogram-panel"
          $toggleStatus={showHistogram}
        >
          <HeaderSection
            alignHeader={alignHeader}
            id={uniqueQueryId}
            inspectTitle={inspectTitle}
            outerDirection="column"
            title={titleText}
            titleSize={titleSize}
            toggleStatus={showHistogram}
            toggleQuery={hideQueryToggle ? undefined : toggleQuery}
            showInspectButton={isChartEmbeddablesEnabled ? false : chartOptionsContextMenu == null}
            subtitle={subtitle}
            isInspectDisabled={isInspectDisabled}
          >
            <EuiFlexGroup alignItems="flexStart" data-test-subj="panelFlexGroup" gutterSize="none">
              <EuiFlexItem grow={false}>
                {showStackBy && (
                  <>
                    <StackByComboBox
                      data-test-subj="stackByComboBox"
                      inputRef={setComboboxInputRef}
                      onSelect={onSelect}
                      prepend={stackByLabel}
                      ref={comboboxRef}
                      selected={selectedStackByOption}
                      useLensCompatibleFields={isChartEmbeddablesEnabled}
                      width={stackByWidth}
                    />
                    {showGroupByPlaceholder && (
                      <>
                        <EuiSpacer data-test-subj="placeholderSpacer" size="s" />
                        <EuiToolTip
                          data-test-subj="placeholderTooltip"
                          content={i18n.NOT_AVAILABLE_TOOLTIP}
                        >
                          <StackByComboBox
                            data-test-subj="stackByPlaceholder"
                            isDisabled={true}
                            onSelect={noop}
                            prepend={GROUP_BY_TOP_LABEL}
                            selected=""
                            useLensCompatibleFields={isChartEmbeddablesEnabled}
                            width={stackByWidth}
                          />
                        </EuiToolTip>
                      </>
                    )}
                  </>
                )}
                {headerChildren != null && headerChildren}
              </EuiFlexItem>
              {chartOptionsContextMenu != null && !isChartEmbeddablesEnabled && (
                <OptionsFlexItem grow={false}>
                  {chartOptionsContextMenu(uniqueQueryId)}
                </OptionsFlexItem>
              )}
              {linkButton}
            </EuiFlexGroup>
          </HeaderSection>
          {showHistogram ? (
            isChartEmbeddablesEnabled ? (
              <VisualizationEmbeddable
                data-test-subj="embeddable-matrix-histogram"
                extraActions={extraActions}
                extraOptions={{
                  filters,
                }}
                getLensAttributes={getLensAttributes}
                height={chartHeight ?? CHART_HEIGHT}
                id={visualizationId}
                inspectTitle={inspectTitle ?? title}
                scopeId={SourcererScopeName.detections}
                stackByField={selectedStackByOption}
                timerange={timerange}
              />
            ) : isInitialLoading ? (
              <MatrixLoader />
            ) : (
              <AlertsHistogram
                chartHeight={chartHeight}
                data={formattedAlertsData}
                from={from}
                legendItems={legendItems}
                legendPosition={legendPosition}
                legendMinWidth={showCountsInLegend ? LEGEND_WITH_COUNTS_WIDTH : undefined}
                loading={isLoadingAlerts}
                to={to}
                showLegend={showLegend}
                updateDateRange={updateDateRange}
              />
            )
          ) : null}
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsHistogramPanel.displayName = 'AlertsHistogramPanel';

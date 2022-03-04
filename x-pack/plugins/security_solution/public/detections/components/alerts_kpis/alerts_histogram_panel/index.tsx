/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Position } from '@elastic/charts';
import type { EuiTitleSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';
import uuid from 'uuid';

import type { Filter, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { DEFAULT_NUMBER_FORMAT, APP_UI_ID } from '../../../../../common/constants';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import type { LegendItem } from '../../../../common/components/charts/draggable_legend_item';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { getDetectionEngineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { defaultLegendColors } from '../../../../common/components/matrix_histogram/utils';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { MatrixLoader } from '../../../../common/components/matrix_histogram/matrix_loader';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import {
  parseCombinedQueries,
  buildCombinedQueries,
  formatAlertsData,
  getAlertsHistogramQuery,
  showInitialLoadingSpinner,
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
import { ChartOptionsFlexItem } from '../../../pages/detection_engine/chart_context_menu';

const defaultTotalAlertsObj: AlertsTotal = {
  value: 0,
  relation: 'eq',
};

export const DETECTIONS_HISTOGRAM_ID = 'detections-histogram';

const ViewAlertsFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeL};
`;

interface AlertsHistogramPanelProps {
  chartHeight?: number;
  chartOptionsContextMenu?: React.ReactNode;
  combinedQueries?: string;
  defaultStackByOption?: string;
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  onFieldSelected?: (field: string) => void;
  /** Override all defaults, and only display this field */
  onlyField?: AlertsStackByField;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  panelHeight?: number;
  titleSize?: EuiTitleSize;
  query?: Query;
  legendPosition?: Position;
  signalIndexName: string | null;
  showCountsInLegend?: boolean;
  showLegend?: boolean;
  showLinkToAlerts?: boolean;
  showTotalAlertsCount?: boolean;
  showStackBy?: boolean;
  stackByWidth?: number;
  timelineId?: string;
  title?: string;
  updateDateRange: UpdateDateRange;
  runtimeMappings?: MappingRuntimeFields;
}

const NO_LEGEND_DATA: LegendItem[] = [];

export const AlertsHistogramPanel = memo<AlertsHistogramPanelProps>(
  ({
    chartHeight,
    chartOptionsContextMenu,
    combinedQueries,
    defaultStackByOption = DEFAULT_STACK_BY_FIELD,
    filters,
    headerChildren,
    onFieldSelected,
    onlyField,
    paddingSize = 'm',
    panelHeight = PANEL_HEIGHT,
    query,
    legendPosition = 'right',
    signalIndexName,
    showCountsInLegend = false,
    showLegend = true,
    showLinkToAlerts = false,
    showTotalAlertsCount = false,
    showStackBy = true,
    stackByWidth,
    timelineId,
    title = i18n.HISTOGRAM_HEADER,
    updateDateRange,
    titleSize = 'm',
    runtimeMappings,
  }) => {
    const { to, from, deleteQuery, setQuery } = useGlobalTime(false);

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_HISTOGRAM_ID}-${uuid.v4()}`, []);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isInspectDisabled, setIsInspectDisabled] = useState(false);
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const [totalAlertsObj, setTotalAlertsObj] = useState<AlertsTotal>(defaultTotalAlertsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<string>(
      onlyField == null ? defaultStackByOption : onlyField
    );
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
    const [querySkip, setQuerySkip] = useState(!toggleStatus);
    useEffect(() => {
      setQuerySkip(!toggleStatus);
    }, [toggleStatus]);
    const toggleQuery = useCallback(
      (status: boolean) => {
        setToggleStatus(status);
        // toggle on = skipQuery false
        setQuerySkip(!status);
      },
      [setQuerySkip, setToggleStatus]
    );
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
      skip: querySkip,
    });

    const kibana = useKibana();
    const { navigateToApp } = kibana.services.application;
    const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.alerts);

    const totalAlerts = useMemo(
      () =>
        i18n.SHOWING_ALERTS(
          numeral(totalAlertsObj.value).format(defaultNumberFormat),
          totalAlertsObj.value,
          totalAlertsObj.relation === 'gte' ? '>' : totalAlertsObj.relation === 'lte' ? '<' : ''
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [totalAlertsObj]
    );

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
                `draggable-legend-item-${uuid.v4()}-${selectedStackByOption}-${bucket.key}`
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
      setQuery,
      response,
      request,
      refetch,
      uniqueQueryId,
      deleteQuery,
      loading: isLoadingAlerts,
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

    return (
      <InspectButtonContainer show={!isInitialLoading && toggleStatus}>
        <KpiPanel
          height={panelHeight}
          hasBorder
          paddingSize={paddingSize}
          data-test-subj="alerts-histogram-panel"
          $toggleStatus={toggleStatus}
        >
          <HeaderSection
            id={uniqueQueryId}
            title={titleText}
            titleSize={titleSize}
            toggleStatus={toggleStatus}
            toggleQuery={toggleQuery}
            subtitle={!isInitialLoading && showTotalAlertsCount && totalAlerts}
            isInspectDisabled={isInspectDisabled}
            hideSubtitle
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {showStackBy && (
                  <>
                    <StackByComboBox
                      selected={selectedStackByOption}
                      onSelect={onSelect}
                      width={stackByWidth}
                    />
                  </>
                )}
                {headerChildren != null && headerChildren}
              </EuiFlexItem>
              {chartOptionsContextMenu != null && (
                <ChartOptionsFlexItem grow={false}>{chartOptionsContextMenu}</ChartOptionsFlexItem>
              )}

              {linkButton}
            </EuiFlexGroup>
          </HeaderSection>

          {toggleStatus ? (
            isInitialLoading ? (
              <MatrixLoader />
            ) : (
              <AlertsHistogram
                chartHeight={chartHeight}
                data={formattedAlertsData}
                from={from}
                legendItems={legendItems}
                legendPosition={legendPosition}
                loading={isLoadingAlerts}
                to={to}
                showCountsInLegend={showCountsInLegend}
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

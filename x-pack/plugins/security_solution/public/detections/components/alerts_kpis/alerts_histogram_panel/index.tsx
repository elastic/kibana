/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Position } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiTitleSize } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';
import uuid from 'uuid';

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { DEFAULT_NUMBER_FORMAT, APP_ID } from '../../../../../common/constants';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import type { LegendItem } from '../../../../common/components/charts/draggable_legend_item';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { HeaderSection } from '../../../../common/components/header_section';
import { Filter, esQuery, Query } from '../../../../../../../../src/plugins/data/public';
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
import { KpiPanel, StackBySelect } from '../common/components';

import { useInspectButton } from '../common/hooks';

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
  combinedQueries?: string;
  defaultStackByOption?: AlertsStackByField;
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  /** Override all defaults, and only display this field */
  onlyField?: AlertsStackByField;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  titleSize?: EuiTitleSize;
  query?: Query;
  legendPosition?: Position;
  signalIndexName: string | null;
  showLegend?: boolean;
  showLinkToAlerts?: boolean;
  showTotalAlertsCount?: boolean;
  showStackBy?: boolean;
  timelineId?: string;
  title?: string;
  updateDateRange: UpdateDateRange;
}

const NO_LEGEND_DATA: LegendItem[] = [];

export const AlertsHistogramPanel = memo<AlertsHistogramPanelProps>(
  ({
    chartHeight,
    combinedQueries,
    defaultStackByOption = DEFAULT_STACK_BY_FIELD,
    filters,
    headerChildren,
    onlyField,
    paddingSize = 'm',
    query,
    legendPosition = 'right',
    signalIndexName,
    showLegend = true,
    showLinkToAlerts = false,
    showTotalAlertsCount = false,
    showStackBy = true,
    timelineId,
    title = i18n.HISTOGRAM_HEADER,
    updateDateRange,
    titleSize = 'm',
  }) => {
    const { to, from, deleteQuery, setQuery } = useGlobalTime(false);

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_HISTOGRAM_ID}-${uuid.v4()}`, []);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isInspectDisabled, setIsInspectDisabled] = useState(false);
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const [totalAlertsObj, setTotalAlertsObj] = useState<AlertsTotal>(defaultTotalAlertsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<AlertsStackByField>(
      onlyField == null ? defaultStackByOption : onlyField
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
        buildCombinedQueries(combinedQueries)
      ),
      indexName: signalIndexName,
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
        navigateToApp(APP_ID, {
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
              dataProviderId: escapeDataProviderId(
                `draggable-legend-item-${uuid.v4()}-${selectedStackByOption}-${bucket.key}`
              ),
              field: selectedStackByOption,
              timelineId,
              value: bucket.key,
            }))
          : NO_LEGEND_DATA,
      [
        alertsData?.aggregations?.alertsByGrouping.buckets,
        selectedStackByOption,
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
          converted = esQuery.buildEsQuery(
            undefined,
            query != null ? [query] : [],
            filters?.filter((f) => f.meta.disabled === false) ?? [],
            {
              ...esQuery.getEsQueryConfig(kibana.services.uiSettings),
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
            !isEmpty(converted) ? [converted] : []
          )
        );
      } catch (e) {
        setIsInspectDisabled(true);
        setAlertsQuery(getAlertsHistogramQuery(selectedStackByOption, from, to, []));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStackByOption, from, to, query, filters, combinedQueries]);

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
      () => (
        <span className="eui-textBreakNormal">
          {onlyField == null ? title : i18n.TOP(onlyField)}
        </span>
      ),
      [onlyField, title]
    );

    return (
      <InspectButtonContainer data-test-subj="alerts-histogram-panel" show={!isInitialLoading}>
        <KpiPanel height={PANEL_HEIGHT} hasBorder paddingSize={paddingSize}>
          <HeaderSection
            id={uniqueQueryId}
            title={titleText}
            titleSize={titleSize}
            subtitle={!isInitialLoading && showTotalAlertsCount && totalAlerts}
            isInspectDisabled={isInspectDisabled}
            hideSubtitle
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {showStackBy && (
                  <StackBySelect
                    selected={selectedStackByOption}
                    onSelect={setSelectedStackByOption}
                  />
                )}
                {headerChildren != null && headerChildren}
              </EuiFlexItem>
              {linkButton}
            </EuiFlexGroup>
          </HeaderSection>

          {isInitialLoading ? (
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
              showLegend={showLegend}
              updateDateRange={updateDateRange}
            />
          )}
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsHistogramPanel.displayName = 'AlertsHistogramPanel';

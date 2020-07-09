/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Position } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiPanel } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';
import uuid from 'uuid';

import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { DEFAULT_NUMBER_FORMAT, APP_ID } from '../../../../common/constants';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { LegendItem } from '../../../common/components/charts/draggable_legend_item';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { HeaderSection } from '../../../common/components/header_section';
import { Filter, esQuery, Query } from '../../../../../../../src/plugins/data/public';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { getDetectionEngineUrl, useFormatUrl } from '../../../common/components/link_to';
import { defaultLegendColors } from '../../../common/components/matrix_histogram/utils';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { MatrixLoader } from '../../../common/components/matrix_histogram/matrix_loader';
import { MatrixHistogramOption } from '../../../common/components/matrix_histogram/types';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import { alertsHistogramOptions } from './config';
import { formatAlertsData, getAlertsHistogramQuery, showInitialLoadingSpinner } from './helpers';
import { AlertsHistogram } from './alerts_histogram';
import * as i18n from './translations';
import { AlertsHistogramOption, AlertsAggregation, AlertsTotal } from './types';
import { LinkButton } from '../../../common/components/links';
import { SecurityPageName } from '../../../app/types';

const DEFAULT_PANEL_HEIGHT = 300;

const StyledEuiPanel = styled(EuiPanel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
  position: relative;
`;

const defaultTotalAlertsObj: AlertsTotal = {
  value: 0,
  relation: 'eq',
};

export const DETECTIONS_HISTOGRAM_ID = 'detections-histogram';

const ViewAlertsFlexItem = styled(EuiFlexItem)`
  margin-left: 24px;
`;

interface AlertsHistogramPanelProps
  extends Pick<GlobalTimeArgs, 'from' | 'to' | 'setQuery' | 'deleteQuery'> {
  chartHeight?: number;
  defaultStackByOption?: AlertsHistogramOption;
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  /** Override all defaults, and only display this field */
  onlyField?: string;
  query?: Query;
  legendPosition?: Position;
  panelHeight?: number;
  signalIndexName: string | null;
  showLinkToAlerts?: boolean;
  showTotalAlertsCount?: boolean;
  stackByOptions?: AlertsHistogramOption[];
  timelineId?: string;
  title?: string;
  updateDateRange: UpdateDateRange;
}

const getHistogramOption = (fieldName: string): MatrixHistogramOption => ({
  text: fieldName,
  value: fieldName,
});

const NO_LEGEND_DATA: LegendItem[] = [];

export const AlertsHistogramPanel = memo<AlertsHistogramPanelProps>(
  ({
    chartHeight,
    defaultStackByOption = alertsHistogramOptions[0],
    deleteQuery,
    filters,
    headerChildren,
    onlyField,
    query,
    from,
    legendPosition = 'right',
    panelHeight = DEFAULT_PANEL_HEIGHT,
    setQuery,
    signalIndexName,
    showLinkToAlerts = false,
    showTotalAlertsCount = false,
    stackByOptions,
    timelineId,
    title = i18n.HISTOGRAM_HEADER,
    to,
    updateDateRange,
  }) => {
    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_HISTOGRAM_ID}-${uuid.v4()}`, []);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
    const [totalAlertsObj, setTotalAlertsObj] = useState<AlertsTotal>(defaultTotalAlertsObj);
    const [selectedStackByOption, setSelectedStackByOption] = useState<AlertsHistogramOption>(
      onlyField == null ? defaultStackByOption : getHistogramOption(onlyField)
    );
    const {
      loading: isLoadingAlerts,
      data: alertsData,
      setQuery: setAlertsQuery,
      response,
      request,
      refetch,
    } = useQueryAlerts<{}, AlertsAggregation>(
      getAlertsHistogramQuery(selectedStackByOption.value, from, to, []),
      signalIndexName
    );
    const kibana = useKibana();
    const { navigateToApp } = kibana.services.application;
    const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.detections);

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

    const setSelectedOptionCallback = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStackByOption(
        stackByOptions?.find((co) => co.value === event.target.value) ?? defaultStackByOption
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goToDetectionEngine = useCallback(
      (ev) => {
        ev.preventDefault();
        navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
          path: getDetectionEngineUrl(urlSearch),
        });
      },
      [navigateToApp, urlSearch]
    );
    const formattedAlertsData = useMemo(() => formatAlertsData(alertsData), [alertsData]);

    const legendItems: LegendItem[] = useMemo(
      () =>
        alertsData?.aggregations?.alertsByGrouping?.buckets != null
          ? alertsData.aggregations.alertsByGrouping.buckets.map((bucket, i) => ({
              color: i < defaultLegendColors.length ? defaultLegendColors[i] : undefined,
              dataProviderId: escapeDataProviderId(
                `draggable-legend-item-${uuid.v4()}-${selectedStackByOption.value}-${bucket.key}`
              ),
              field: selectedStackByOption.value,
              timelineId,
              value: bucket.key,
            }))
          : NO_LEGEND_DATA,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [alertsData, selectedStackByOption.value, timelineId]
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

    useEffect(() => {
      return () => {
        if (deleteQuery) {
          deleteQuery({ id: uniqueQueryId });
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (refetch != null && setQuery != null) {
        setQuery({
          id: uniqueQueryId,
          inspect: {
            dsl: [request],
            response: [response],
          },
          loading: isLoadingAlerts,
          refetch,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setQuery, isLoadingAlerts, alertsData, response, request, refetch]);

    useEffect(() => {
      setTotalAlertsObj(
        alertsData?.hits.total ?? {
          value: 0,
          relation: 'eq',
        }
      );
    }, [alertsData]);

    useEffect(() => {
      const converted = esQuery.buildEsQuery(
        undefined,
        query != null ? [query] : [],
        filters?.filter((f) => f.meta.disabled === false) ?? [],
        {
          ...esQuery.getEsQueryConfig(kibana.services.uiSettings),
          dateFormatTZ: undefined,
        }
      );

      setAlertsQuery(
        getAlertsHistogramQuery(
          selectedStackByOption.value,
          from,
          to,
          !isEmpty(converted) ? [converted] : []
        )
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStackByOption.value, from, to, query, filters]);

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

    const titleText = useMemo(() => (onlyField == null ? title : i18n.TOP(onlyField)), [
      onlyField,
      title,
    ]);

    return (
      <InspectButtonContainer data-test-subj="alerts-histogram-panel" show={!isInitialLoading}>
        <StyledEuiPanel height={panelHeight}>
          <HeaderSection
            id={uniqueQueryId}
            title={titleText}
            titleSize={onlyField == null ? 'm' : 's'}
            subtitle={!isInitialLoading && showTotalAlertsCount && totalAlerts}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                {stackByOptions && (
                  <EuiSelect
                    onChange={setSelectedOptionCallback}
                    options={stackByOptions}
                    prepend={i18n.STACK_BY_LABEL}
                    value={selectedStackByOption.value}
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
              updateDateRange={updateDateRange}
            />
          )}
        </StyledEuiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsHistogramPanel.displayName = 'AlertsHistogramPanel';

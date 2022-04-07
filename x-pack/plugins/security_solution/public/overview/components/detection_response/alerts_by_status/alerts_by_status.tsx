/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Datum } from '@elastic/charts';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { FormattedRelative } from '@kbn/i18n-react';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { useNavigation } from '../../../../common/lib/kibana';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { Panel } from '../../../../common/components/panel';
import { HISTOGRAM_ACTIONS_BUTTON_CLASS } from '../../../../common/components/visualization_actions';
import { ViewDetailsButton } from './view_details_button';
import { LegendItem } from '../../../../common/components/charts/legend_item';
import { useAlertsByStatus } from './use_alerts_by_status';
import {
  ALERTS,
  ALERTS_TITLE,
  STATUS_ACKNOWLEDGED,
  STATUS_CLOSED,
  STATUS_CRITICAL_LABEL,
  STATUS_HIGH_LABEL,
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
  STATUS_OPEN,
  UPDATING,
} from '../translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { getDetectionEngineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { UPDATED, VIEW_ALERTS } from '../../../pages/translations';
import { SEVERITY_COLOR } from '../utils';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { ChartLabel } from './chart_label';
import { Legend } from '../../../../common/components/charts/legend';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';

const HistogramPanel = styled(Panel)<{ $height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ $height }) => ($height != null ? `height: ${$height};` : '')}
`;
const defaultPanelHeight = 300;
const donutHeight = 120;

interface AlertsByStatusProps {
  signalIndexName: string | null;
}

const panelSettings = {
  panelHeight: `${defaultPanelHeight}px`,
  paddingSize: 'm',
};
const legendField = 'kibana.alert.severity';
const chartConfigs: Array<{ key: Severity; label: string; color: string }> = [
  { key: 'critical', label: STATUS_CRITICAL_LABEL, color: SEVERITY_COLOR.critical },
  { key: 'high', label: STATUS_HIGH_LABEL, color: SEVERITY_COLOR.high },
  { key: 'medium', label: STATUS_MEDIUM_LABEL, color: SEVERITY_COLOR.medium },
  { key: 'low', label: STATUS_LOW_LABEL, color: SEVERITY_COLOR.low },
];
const DETECTION_RESPONSE_ALERTS_BY_STATUS_ID = 'detection-response-alerts-by-status';

export const AlertsByStatus = ({ signalIndexName }: AlertsByStatusProps) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTION_RESPONSE_ALERTS_BY_STATUS_ID);
  const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.alerts);
  const { navigateTo } = useNavigation();
  const goToAlerts = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({
        appId: APP_UI_ID,
        deepLinkId: SecurityPageName.alerts,
        path: getDetectionEngineUrl(urlSearch),
      });
    },
    [navigateTo, urlSearch]
  );

  const detailsButtonOptions = useMemo(
    () => ({
      name: VIEW_ALERTS,
      href: formatUrl(getDetectionEngineUrl()),
      onClick: goToAlerts,
    }),
    [formatUrl, goToAlerts]
  );

  const {
    items: donutData,
    isLoading: loading,
    updatedAt,
  } = useAlertsByStatus({
    signalIndexName,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
    skip: !toggleStatus,
  });
  const legendItems: LegendItem[] = useMemo(
    () =>
      chartConfigs.map((d) => ({
        color: d.color,
        field: legendField,
        value: d.label,
      })),
    []
  );
  const subtitle = useMemo(
    () =>
      loading ? (
        UPDATING
      ) : (
        <>
          {UPDATED}{' '}
          <FormattedRelative
            data-test-subj="alerts-by-status-last-update"
            key={`formattedRelative-${Date.now()}`}
            value={new Date(updatedAt)}
          />
        </>
      ),
    [loading, updatedAt]
  );
  const totalAlerts =
    loading || donutData == null
      ? 0
      : (donutData?.open?.total ?? 0) +
        (donutData?.acknowledged?.total ?? 0) +
        (donutData?.closed?.total ?? 0);

  const fillColor = useCallback((d: Datum) => {
    return chartConfigs.find((cfg) => cfg.label === d.dataName)?.color ?? emptyDonutColor;
  }, []);

  return (
    <>
      <HoverVisibilityContainer show={true} targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}>
        <HistogramPanel
          data-test-subj={`${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-panel`}
          height={toggleStatus ? 'auto' : panelSettings.panelHeight}
          paddingSize={panelSettings.paddingSize}
        >
          {loading && (
            <EuiProgress
              data-test-subj="initialLoadingPanelMatrixOverTime"
              size="xs"
              position="absolute"
              color="accent"
            />
          )}
          <HeaderSection
            id={DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}
            title={ALERTS_TITLE}
            subtitle={subtitle}
            inspectMultiple
            toggleStatus={toggleStatus}
            toggleQuery={setToggleStatus}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <ViewDetailsButton
                  onClick={detailsButtonOptions.onClick}
                  href={detailsButtonOptions.href}
                  name={detailsButtonOptions.name}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          {toggleStatus && (
            <>
              {!loading && (
                <EuiText className="eui-textCenter">
                  <b>
                    <FormattedCount count={totalAlerts} />
                  </b>
                  <> </>
                  <small>{ALERTS(totalAlerts)}</small>
                </EuiText>
              )}
              <EuiFlexGroup>
                <EuiFlexItem key={`alerts-status-open`}>
                  <DonutChart
                    data={donutData?.open?.severities}
                    fillColor={fillColor}
                    height={donutHeight}
                    label={STATUS_OPEN}
                    title={<ChartLabel count={donutData?.open?.total ?? 0} />}
                    totalCount={donutData?.open?.total ?? 0}
                  />
                </EuiFlexItem>
                <EuiFlexItem key={`alerts-status-acknowledged`}>
                  <DonutChart
                    data={donutData?.acknowledged?.severities}
                    fillColor={fillColor}
                    height={donutHeight}
                    label={STATUS_ACKNOWLEDGED}
                    title={<ChartLabel count={donutData?.acknowledged?.total ?? 0} />}
                    totalCount={donutData?.acknowledged?.total ?? 0}
                  />
                </EuiFlexItem>
                <EuiFlexItem key={`alerts-status-closed`}>
                  <DonutChart
                    data={donutData?.closed?.severities}
                    fillColor={fillColor}
                    height={donutHeight}
                    label={STATUS_CLOSED}
                    title={<ChartLabel count={donutData?.closed?.total ?? 0} />}
                    totalCount={donutData?.closed?.total ?? 0}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  {legendItems.length > 0 && <Legend legendItems={legendItems} />}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}
        </HistogramPanel>
      </HoverVisibilityContainer>
    </>
  );
};

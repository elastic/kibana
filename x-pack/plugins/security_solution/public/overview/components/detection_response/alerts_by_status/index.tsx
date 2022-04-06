/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import uuid from 'uuid';
import { Datum } from '@elastic/charts';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { useNavigation } from '../../../../common/lib/kibana';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { Panel } from '../../../../common/components/panel';
import { HISTOGRAM_ACTIONS_BUTTON_CLASS } from '../../../../common/components/visualization_actions';
import { ViewDetailsButton } from './view_details_button';
import { LegendItem } from '../../../../common/components/charts/draggable_legend_item';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { DraggableLegend } from '../../../../common/components/charts/draggable_legend';
import { useAlertsByStatus } from './use_alerts_by_status';
import {
  ALERTS,
  ALERTS_TITLE,
  STATUS_ACKNOWLEDGED,
  STATUS_CLOSED,
  STATUS_OPEN,
} from '../translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { getDetectionEngineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { VIEW_ALERTS } from '../../../pages/translations';
import { SEVERITY_COLOR } from '../utils';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { ChartLabel } from './chart_label';

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

type PaddingSize = 's' | 'none' | 'm' | 'l';

const panelSettings = {
  panelHeight: `${defaultPanelHeight}px`,
  paddingSize: 'm' as PaddingSize,
};
const legendField = 'kibana.alert.severity';
const colors = SEVERITY_COLOR;
const legends: Severity[] = ['critical', 'high', 'medium', 'low'];
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

  const { items: donutData, isLoading: loading } = useAlertsByStatus({
    signalIndexName,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
    skip: !toggleStatus,
  });
  const legendItems: LegendItem[] = useMemo(
    () =>
      legends.map((d) => ({
        color: colors[d],
        dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d}`),
        timelineId: undefined,
        field: legendField,
        value: d,
      })),
    []
  );

  const totalAlerts =
    loading || !donutData
      ? null
      : (donutData?.open?.total ?? 0) +
        (donutData?.acknowledged?.total ?? 0) +
        (donutData?.closed?.total ?? 0);

  const fillColor = useCallback((d: Datum) => {
    switch (d.dataName) {
      case 'low':
        return colors.low;
      case 'medium':
        return colors.medium;
      case 'high':
        return colors.high;
      case 'critical':
        return colors.critical;
      default:
        return colors.low;
    }
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
              {!loading && totalAlerts != null && (
                <EuiText className="eui-textCenter">
                  <b>
                    <FormattedCount count={totalAlerts} />
                  </b>
                  <> </>
                  <small>{ALERTS(totalAlerts)}</small>
                </EuiText>
              )}
              <EuiFlexGroup>
                {!loading && (
                  <EuiFlexItem key={`alerts-status-open`}>
                    <DonutChart
                      colors={SEVERITY_COLOR}
                      data={donutData?.open?.severities}
                      fillColor={fillColor}
                      height={donutHeight}
                      label={STATUS_OPEN}
                      showLegend={false}
                      title={<ChartLabel count={donutData?.open?.total} />}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem key={`alerts-status-acknowledged`}>
                  {!loading && (
                    <DonutChart
                      colors={SEVERITY_COLOR}
                      data={donutData?.acknowledged?.severities}
                      fillColor={fillColor}
                      height={donutHeight}
                      label={STATUS_ACKNOWLEDGED}
                      showLegend={false}
                      title={<ChartLabel count={donutData?.acknowledged?.total} />}
                    />
                  )}
                </EuiFlexItem>
                <EuiFlexItem key={`alerts-status-closed`}>
                  {!loading && (
                    <DonutChart
                      colors={SEVERITY_COLOR}
                      data={donutData?.closed?.severities}
                      fillColor={fillColor}
                      height={donutHeight}
                      label={STATUS_CLOSED}
                      showLegend={false}
                      title={<ChartLabel count={donutData?.closed?.total} />}
                    />
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  {legendItems.length > 0 && (
                    <DraggableLegend legendItems={legendItems} height={donutHeight} />
                  )}
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

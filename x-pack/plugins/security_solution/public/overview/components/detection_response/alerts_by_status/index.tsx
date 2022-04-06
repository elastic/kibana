/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';
import classnames from 'classnames';
import uuid from 'uuid';
import { Datum } from '@elastic/charts';
import { DonutChart, NO_LEGEND_DATA } from '../../../../common/components/charts/donutchart';
import { APP_ID, APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import {
  useGetUserCasesPermissions,
  useKibana,
  useNavigation,
} from '../../../../common/lib/kibana';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { Panel } from '../../../../common/components/panel';
import {
  HISTOGRAM_ACTIONS_BUTTON_CLASS,
  VisualizationActions,
} from '../../../../common/components/visualization_actions';
import { VisualizationActionsProps } from '../../../../common/components/visualization_actions/types';
import { ViewDetailsButton } from './view_details_button';
import { LegendItem } from '../../../../common/components/charts/draggable_legend_item';
import { ThemeContext } from '../../../../common/components/charts/donut_theme_context';
import { escapeDataProviderId } from '../../../../common/components/drag_and_drop/helpers';
import { DraggableLegend } from '../../../../common/components/charts/draggable_legend';
import { useAlertsByStatus } from './use_alerts_by_status';
import { FormattedCount } from './formatted_count';
import { ALERTS } from './translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { getDetectionEngineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { VIEW_ALERTS } from '../../../pages/translations';

const HistogramPanel = styled(Panel)<{ $height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ $height }) => ($height != null ? `height: ${$height};` : '')}
`;
const defaultPanelHeight = 300;
const donutHeight = 120;

interface AlertsByStatusProps {
  headerChildren?: React.ReactNode;
  queryId: string;
  showSpacer?: boolean;
  signalIndexName: string | null;
  subtitle?: string;
  title: string;
}

type PaddingSize = 's' | 'none' | 'm' | 'l';

interface PanelSettings {
  panelHeight: string;
  paddingSize: PaddingSize;
}

type VisualizationActionsOptions = Omit<
  VisualizationActionsProps,
  'queryId' | 'title' | 'isInspectButtonDisabled'
>;

interface Others {
  panelSettings?: PanelSettings;
  visualizationActionsOptions?: VisualizationActionsOptions;
}

type Props = AlertsByStatusProps & Others;

const DefaultPanelSettings = {
  panelHeight: `${defaultPanelHeight}px`,
  paddingSize: 'm' as PaddingSize,
};

const legendField = 'kibana.alert.severity';

export const AlertsByStatus = ({
  headerChildren,
  panelSettings = DefaultPanelSettings,
  queryId,
  showSpacer,
  signalIndexName,
  subtitle,
  title,
  visualizationActionsOptions,
}: Props) => {
  const { cases } = useKibana().services;
  const CasesContext = cases.ui.getCasesContext();
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
  const { colors } = useContext(ThemeContext);
  const { toggleStatus, setToggleStatus } = useQueryToggle(queryId);
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
    queryId,
    skip: !toggleStatus,
  });
  const legendItems: LegendItem[] = useMemo(
    () =>
      !loading && donutData?.length > 0 && legendField
        ? (donutData[0] && donutData[0].buckets).map((d) => ({
            color: colors[d.key],
            dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.key}`),
            timelineId: undefined,
            field: legendField,
            value: d.key,
          }))
        : NO_LEGEND_DATA,
    [colors, donutData, loading]
  );

  const totalAlerts = useMemo(
    () => donutData.reduce((acc, curr) => acc + curr.doc_count, 0),
    [donutData]
  );

  const fillColor = useCallback(
    (d: Datum) => {
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
    },
    [colors.critical, colors.high, colors.low, colors.medium]
  );
  return (
    <>
      <HoverVisibilityContainer show={true} targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}>
        <HistogramPanel
          data-test-subj={`${queryId}Panel`}
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
            id={queryId}
            title={title}
            subtitle={subtitle}
            inspectMultiple
            toggleStatus={toggleStatus}
            toggleQuery={setToggleStatus}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              {visualizationActionsOptions && (
                <EuiFlexItem grow={false}>
                  <CasesContext owner={[APP_ID]} userCanCrud={userCanCrud ?? false}>
                    <VisualizationActions
                      {...visualizationActionsOptions}
                      className={classnames(
                        visualizationActionsOptions.className,
                        'histogram-viz-actions'
                      )}
                      isInspectButtonDisabled={false}
                      queryId={queryId}
                      title={title}
                    />
                  </CasesContext>
                </EuiFlexItem>
              )}

              <EuiFlexItem grow={false}>
                <ViewDetailsButton
                  onClick={detailsButtonOptions.onClick}
                  href={detailsButtonOptions.href}
                  name={detailsButtonOptions.name}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{headerChildren}</EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          {toggleStatus && (
            <>
              <EuiText className="eui-textCenter">
                <FormattedCount count={totalAlerts} />
                <> </>
                <small>{ALERTS(totalAlerts)}</small>
              </EuiText>
              <EuiFlexGroup>
                {!loading &&
                  donutData?.map((data) => (
                    <EuiFlexItem key={`alerts-status-${data.key}`}>
                      <DonutChart
                        data={data.buckets}
                        height={donutHeight}
                        link={data.link}
                        label={data.label}
                        showLegend={false}
                        isEmptyChart={data.doc_count === 0}
                        sum={<FormattedCount count={data.doc_count} />}
                        fillColor={fillColor}
                      />
                    </EuiFlexItem>
                  ))}
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
      {showSpacer && <EuiSpacer data-test-subj="spacer" size="l" />}
    </>
  );
};

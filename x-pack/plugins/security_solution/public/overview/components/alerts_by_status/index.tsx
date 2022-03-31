/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';
import classnames from 'classnames';
import uuid from 'uuid';
import { DonutChart, NO_LEGEND_DATA } from '../../../common/components/charts/donutchart';
import { APP_ID } from '../../../../common/constants';
import { useGetUserCasesPermissions, useKibana } from '../../../common/lib/kibana';
import { HeaderSection } from '../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../common/components/hover_visibility_container';
import { MatrixLoader } from '../../../common/components/matrix_histogram/matrix_loader';
import { Panel } from '../../../common/components/panel';
import {
  HISTOGRAM_ACTIONS_BUTTON_CLASS,
  VisualizationActions,
} from '../../../common/components/visualization_actions';
import { VisualizationActionsProps } from '../../../common/components/visualization_actions/types';
import { ViewDetailsButton, ViewDetailsButtonProps } from './view_details_button';
import { LegendItem } from '../../../common/components/charts/draggable_legend_item';
import { ThemeContext } from '../../../common/components/charts/donut_theme_context';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { DraggableLegend } from '../../../common/components/charts/draggable_legend';
import { ParsedStatusBucket } from './types';

const HistogramPanel = styled(Panel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `min-height: ${height}px;` : '')}
`;
const defaultPanelHeight = 300;
const donutHeight = 120;

interface DonutCardProps {
  donutData: ParsedStatusBucket[] | undefined;
  filterQuery: string;
  headerChildren?: React.ReactNode;
  id: string;
  isInitialLoading: boolean;
  loading: boolean;
  showSpacer?: boolean;
  showInspectButton: boolean;
  subtitle?: string;
  title: string;
}

type PaddingSize = 's' | 'none' | 'm' | 'l';

interface PanelSettings {
  panelHeight: number;
  paddingSize: PaddingSize;
}

type VisualizationActionsOptions = Omit<
  VisualizationActionsProps,
  'queryId' | 'title' | 'isInspectButtonDisabled'
>;

interface Others {
  panelSettings?: PanelSettings;
  visualizationActionsOptions?: VisualizationActionsOptions;
  detailsButtonOptions?: ViewDetailsButtonProps;
}

type Props = DonutCardProps & Others;

const DefaultPanelSettings = {
  panelHeight: defaultPanelHeight,
  paddingSize: 'm' as PaddingSize,
};

const legendField = 'kibana.alert.severity';

export const AlertsByStatus = ({
  detailsButtonOptions,
  donutData,
  filterQuery,
  headerChildren,
  id,
  isInitialLoading,
  loading,
  panelSettings = DefaultPanelSettings,
  showInspectButton,
  showSpacer,
  subtitle,
  title,
  visualizationActionsOptions,
}: Props) => {
  const { cases } = useKibana().services;
  const CasesContext = cases.ui.getCasesContext();
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
  const { colors } = useContext(ThemeContext);

  const legendItems: LegendItem[] = useMemo(
    () =>
      donutData && donutData?.length > 0 && legendField
        ? (donutData[0] && donutData[0].buckets).map((d, i) => ({
            color: colors[i],
            dataProviderId: escapeDataProviderId(`draggable-legend-item-${uuid.v4()}-${d.group}`),
            timelineId: undefined,
            field: legendField,
            value: `${d.key}`,
          }))
        : NO_LEGEND_DATA,
    [colors, donutData]
  );
  return (
    <>
      <HoverVisibilityContainer
        show={isInitialLoading}
        targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}
      >
        <HistogramPanel
          data-test-subj={`${id}Panel`}
          height={panelSettings.panelHeight}
          paddingSize={panelSettings.paddingSize}
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
            title={title}
            subtitle={subtitle}
            inspectMultiple
            showInspectButton={showInspectButton}
            isInspectDisabled={filterQuery === undefined}
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
                      isInspectButtonDisabled={filterQuery === undefined}
                      queryId={id}
                      title={title}
                    />
                  </CasesContext>
                </EuiFlexItem>
              )}
              {detailsButtonOptions?.name &&
                (detailsButtonOptions?.onClick || detailsButtonOptions?.href) && (
                  <EuiFlexItem grow={false}>
                    <ViewDetailsButton
                      onClick={detailsButtonOptions.onClick}
                      href={detailsButtonOptions.href}
                      name={detailsButtonOptions.name}
                    />
                  </EuiFlexItem>
                )}
              <EuiFlexItem grow={false}>{headerChildren}</EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>

          {isInitialLoading ? (
            <MatrixLoader />
          ) : (
            <EuiFlexGroup>
              {donutData?.map((data) => (
                <EuiFlexItem key={`alerts-status-${data.key}`}>
                  <DonutChart
                    data={data.buckets}
                    height={donutHeight}
                    link={data.link}
                    label={data.label}
                    showLegend={false}
                    sum={data.doc_count}
                  />
                </EuiFlexItem>
              ))}
              <EuiFlexItem>
                <DraggableLegend legendItems={legendItems} height={donutHeight} />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </HistogramPanel>
      </HoverVisibilityContainer>
      {showSpacer && <EuiSpacer data-test-subj="spacer" size="l" />}
    </>
  );
};

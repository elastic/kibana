/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { DonutChart } from '.';
import { APP_ID } from '../../../../common/constants';
import { HostsTableType } from '../../../hosts/store/model';
import { useGetUserCasesPermissions, useKibana } from '../../lib/kibana';
import { HeaderSectionProps, HeaderSection } from '../header_section';
import { HoverVisibilityContainer } from '../hover_visibility_container';
import { useFormatUrl } from '../link_to';
import { getTabsOnHostsUrl } from '../link_to/redirect_to_hosts';
import { MatrixLoader } from '../matrix_histogram/matrix_loader';
import { Panel } from '../panel';
import { HISTOGRAM_ACTIONS_BUTTON_CLASS, VisualizationActions } from '../visualization_actions';
import { VisualizationActionsProps } from '../visualization_actions/types';
import { DonutChartData } from './types';

const HistogramPanel = styled(Panel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `min-height: ${height}px;` : '')}
`;
const DEFAULT_PANEL_HEIGHT = 300;

const StyledLinkButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.l};
`;

interface ViewDetailsButtonProps {
  viewDetailsButtonClick: () => void;
  viewDetailsButtonLink: string;
  viewDetailsButtonName: string;
}

const ViewDetailsButton = ({
  viewDetailsButtonClick,
  viewDetailsButtonLink,
  viewDetailsButtonName,
}: ViewDetailsButtonProps) => {
  return (
    <StyledLinkButton
      data-test-subj="view-alerts"
      onClick={viewDetailsButtonClick}
      href={viewDetailsButtonLink}
    >
      {viewDetailsButtonName}
    </StyledLinkButton>
  );
};

interface DonutCardProps {
  donutData: Array<{ key: string; buckets: DonutChartData[] }>;
  filterQuery: string;
  headerChildren?: React.ReactNode;
  id: string;
  isInitialLoading: boolean;
  loading: boolean;
  paddingSize?: 's' | 'none' | 'm' | 'l';
  panelHeight?: number;
  showSpacer?: boolean;
}

type Props = DonutCardProps &
  ViewDetailsButtonProps &
  Omit<HeaderSectionProps, 'children'> &
  VisualizationActionsProps;

export const DonutCard = ({
  panelHeight = DEFAULT_PANEL_HEIGHT,
  paddingSize = 'm',
  id,
  isInitialLoading,
  loading,
  title,
  subtitle,
  showInspectButton,
  showSpacer,
  stackByField,
  timerange,
  getLensAttributes,
  lensAttributes,
  headerChildren,
  donutData,
  filterQuery,
  viewDetailsButtonClick,
  viewDetailsButtonLink,
  viewDetailsButtonName,
}: Props) => {
  const { cases } = useKibana().services;
  const CasesContext = cases.ui.getCasesContext();
  const userPermissions = useGetUserCasesPermissions();
  const userCanCrud = userPermissions?.crud ?? false;
  return (
    <>
      <HoverVisibilityContainer
        show={isInitialLoading}
        targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}
      >
        <HistogramPanel
          data-test-subj={`${id}Panel`}
          height={panelHeight}
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
            title={title}
            subtitle={subtitle}
            inspectMultiple
            showInspectButton={showInspectButton}
            isInspectDisabled={filterQuery === undefined}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              {(getLensAttributes || lensAttributes) && timerange && (
                <EuiFlexItem grow={false}>
                  <CasesContext owner={[APP_ID]} userCanCrud={userCanCrud ?? false}>
                    <VisualizationActions
                      className="histogram-viz-actions"
                      getLensAttributes={getLensAttributes}
                      isInspectButtonDisabled={filterQuery === undefined}
                      lensAttributes={lensAttributes}
                      queryId={id}
                      stackByField={stackByField}
                      timerange={timerange}
                      title={title}
                    />
                  </CasesContext>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <ViewDetailsButton
                  onClick={viewDetailsButtonClick}
                  href={viewDetailsButtonLink}
                  name={viewDetailsButtonName}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{headerChildren}</EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>

          {isInitialLoading ? (
            <MatrixLoader />
          ) : (
            <EuiFlexGroup>
              {donutData.map((data) => (
                <EuiFlexItem key={`alerts-status-${data.key}`}>
                  <DonutChart height={250} data={data.buckets} name={data.key} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </HistogramPanel>
      </HoverVisibilityContainer>
      {showSpacer && <EuiSpacer data-test-subj="spacer" size="l" />}
    </>
  );
};

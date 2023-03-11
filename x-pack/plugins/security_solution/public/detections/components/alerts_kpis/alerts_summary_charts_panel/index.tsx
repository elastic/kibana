/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import styled from 'styled-components';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { SeverityLevelPanel } from '../severity_level_panel';
import { AlertsByTypePanel } from '../alerts_by_type_panel';
import { AlertsProgressBarPanel } from '../alerts_progress_bar_panel';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { GroupBySelection } from '../alerts_progress_bar_panel/types';
import type { AddFilterProps } from '../common/types';

const StyledFlexGroup = styled(EuiFlexGroup)`
  @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.l});
`;

const StyledFlexItem = styled(EuiFlexItem)`
  min-width: 355px;
`;

const DETECTIONS_ALERTS_CHARTS_ID = 'detections-alerts-charts';

interface Props {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  filters?: Filter[];
  addFilter?: ({ field, value, negate }: AddFilterProps) => void;
  panelHeight?: number;
  query?: Query;
  signalIndexName: string | null;
  title?: React.ReactNode;
  runtimeMappings?: MappingRuntimeFields;
  isExpanded?: boolean;
  setIsExpanded?: (status: boolean) => void;
  groupBySelection: GroupBySelection;
  setGroupBySelection: (groupBySelection: GroupBySelection) => void;
}

export const AlertsSummaryChartsPanel: React.FC<Props> = ({
  alignHeader,
  filters,
  addFilter,
  panelHeight,
  query,
  runtimeMappings,
  signalIndexName,
  title = i18n.CHARTS_TITLE,
  isExpanded,
  setIsExpanded,
  groupBySelection,
  setGroupBySelection,
}: Props) => {
  const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');

  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_ALERTS_CHARTS_ID);
  const toggleQuery = useCallback(
    (status: boolean) => {
      if (isAlertsPageChartsEnabled && setIsExpanded) {
        setIsExpanded(status);
      } else {
        setToggleStatus(status);
      }
    },
    [setToggleStatus, setIsExpanded, isAlertsPageChartsEnabled]
  );

  const querySkip = useMemo(
    () => (isAlertsPageChartsEnabled ? !isExpanded : !toggleStatus),
    [isAlertsPageChartsEnabled, isExpanded, toggleStatus]
  );

  const status: boolean = useMemo(() => {
    if (isAlertsPageChartsEnabled && isExpanded) {
      return true;
    }
    if (!isAlertsPageChartsEnabled && toggleStatus) {
      return true;
    }
    return false;
  }, [isAlertsPageChartsEnabled, isExpanded, toggleStatus]);

  return (
    <KpiPanel
      $toggleStatus={
        isAlertsPageChartsEnabled && isExpanded !== undefined ? isExpanded : toggleStatus
      }
      data-test-subj="alerts-charts-panel"
      hasBorder
      height={panelHeight}
    >
      <HeaderSection
        alignHeader={alignHeader}
        outerDirection="row"
        title={title}
        titleSize="s"
        hideSubtitle
        showInspectButton={false}
        toggleStatus={isAlertsPageChartsEnabled ? isExpanded : toggleStatus}
        toggleQuery={toggleQuery}
      />
      {status && (
        <StyledFlexGroup
          data-test-subj="alerts-charts-container"
          className="eui-yScroll"
          wrap
          gutterSize="m"
        >
          <StyledFlexItem>
            <SeverityLevelPanel
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={querySkip}
              addFilter={addFilter}
            />
          </StyledFlexItem>
          <StyledFlexItem>
            <AlertsByTypePanel
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={querySkip}
            />
          </StyledFlexItem>
          <StyledFlexItem>
            <AlertsProgressBarPanel
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={querySkip}
              groupBySelection={groupBySelection}
              setGroupBySelection={setGroupBySelection}
              addFilter={addFilter}
            />
          </StyledFlexItem>
        </StyledFlexGroup>
      )}
    </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';

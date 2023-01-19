/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState, useEffect } from 'react';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import styled from 'styled-components';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { HeaderSection } from '../../../../common/components/header_section';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { SeverityLevelChart } from './severity_donut/severity_level_chart';
import { AlertsByType } from './alerts_by_type/alerts_by_type';
import { AlertsProgressBar } from './alerts_progress_bar/alerts_progress_bar';

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
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
  panelHeight?: number;
  query?: Query;
  signalIndexName: string | null;
  title?: React.ReactNode;
  runtimeMappings?: MappingRuntimeFields;
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
}: Props) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_ALERTS_CHARTS_ID);
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

  return (
    <KpiPanel
      $toggleStatus={toggleStatus}
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
        toggleStatus={toggleStatus}
        toggleQuery={toggleQuery}
      />
      {toggleStatus && (
        <StyledFlexGroup
          data-test-subj="alerts-charts-container"
          className="eui-yScroll"
          wrap
          gutterSize="m"
        >
          <StyledFlexItem>
            <SeverityLevelChart
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={querySkip}
              addFilter={addFilter}
            />
          </StyledFlexItem>
          <StyledFlexItem>
            <AlertsByType
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={querySkip}
            />
          </StyledFlexItem>
          <StyledFlexItem>
            <AlertsProgressBar
              addFilter={addFilter}
              filters={filters}
              query={query}
              signalIndexName={signalIndexName}
              runtimeMappings={runtimeMappings}
              skip={querySkip}
            />
          </StyledFlexItem>
        </StyledFlexGroup>
      )}
    </KpiPanel>
  );
};

AlertsSummaryChartsPanel.displayName = 'AlertsSummaryChartsPanel';

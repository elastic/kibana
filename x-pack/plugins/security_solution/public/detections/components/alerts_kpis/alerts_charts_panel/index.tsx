/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import React, { memo, useMemo, useCallback } from 'react';
// import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import uuid from 'uuid';
import styled from 'styled-components';
import type { Filter, Query } from '@kbn/es-query';
// import { buildEsQuery } from '@kbn/es-query';

// import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import * as i18n from './translations';
import { KpiPanel } from '../common/components';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
// import { PlaceHolder } from './placeholder';
// import { RiskScoreDonutChart } from '../../../../overview/components/entity_analytics/common/risk_score_donut_chart';
export const DETECTIONS_ALERTS_CHARTS_ID = 'detections-alerts-charts';

const PlaceHolder = () => {
  return (
    <EuiFlexItem>
      <EuiPanel grow={true}>
        <EuiText>
          <p>{'placeholder'}</p>
        </EuiText>
      </EuiPanel>
    </EuiFlexItem>
  );
};

interface AlertsChartsPanelProps {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  chartOptionsContextMenu?: (queryId: string) => React.ReactNode;
  filters?: Filter[];
  inspectTitle: string;
  panelHeight?: number;
  query?: Query;
  signalIndexName: string | null;
  title?: React.ReactNode;
  runtimeMappings?: MappingRuntimeFields;
}

export const AlertsChartsPanel = memo<AlertsChartsPanelProps>(
  ({
    alignHeader,
    chartOptionsContextMenu,
    filters,
    inspectTitle,
    panelHeight,
    query,
    runtimeMappings,
    signalIndexName,
    title = i18n.CHARTS_TITLE,
  }) => {
    // const { to, from, deleteQuery, setQuery } = useGlobalTime(false);

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_CHARTS_ID}-${uuid.v4()}`, []);

    // const additionalFilters = useMemo(() => {
    //   try {
    //     return [
    //       buildEsQuery(
    //         undefined,
    //         query != null ? [query] : [],
    //         filters?.filter((f) => f.meta.disabled === false) ?? []
    //       ),
    //     ];
    //   } catch (e) {
    //     return [];
    //   }
    // }, [query, filters]);

    const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_ALERTS_CHARTS_ID);
    // const [querySkip, setQuerySkip] = useState(!toggleStatus);
    // useEffect(() => {
    //   setQuerySkip(!toggleStatus);
    // }, [toggleStatus]);
    const toggleQuery = useCallback(
      (status: boolean) => {
        setToggleStatus(status);
        // toggle on = skipQuery false
        // setQuerySkip(!status);
      },
      [setToggleStatus]
      // [setQuerySkip, setToggleStatus]
    );

    const ChartOptionsFlexItem = styled(EuiFlexItem)`
      margin-left: ${({ theme }) => theme.eui.euiSizeS};
    `;

    return (
      <InspectButtonContainer show={toggleStatus}>
        <KpiPanel
          $toggleStatus={toggleStatus}
          data-test-subj="alertsChartsPanel"
          hasBorder
          height={panelHeight}
        >
          <HeaderSection
            alignHeader={alignHeader}
            id={uniqueQueryId}
            inspectTitle={inspectTitle}
            outerDirection="row"
            title={title}
            titleSize="s"
            hideSubtitle
            showInspectButton={chartOptionsContextMenu == null}
            toggleStatus={toggleStatus}
            toggleQuery={toggleQuery}
          >
            {/* <EuiFlexGroup alignItems="flexStart" data-test-subj="fieldSelection" gutterSize="none"> */}
            {/* <EuiFlexItem grow={false}> */}
            {chartOptionsContextMenu != null && (
              <ChartOptionsFlexItem grow={false}>
                {chartOptionsContextMenu(uniqueQueryId)}
              </ChartOptionsFlexItem>
            )}
            {/* </EuiFlexItem> */}
            {/* </EuiFlexGroup> */}
          </HeaderSection>
          {toggleStatus && (
            <EuiFlexGroup data-test-subj="chartsPanel">
              <PlaceHolder />
              <PlaceHolder />
              <PlaceHolder />
            </EuiFlexGroup>
          )}
        </KpiPanel>
      </InspectButtonContainer>
    );
  }
);

AlertsChartsPanel.displayName = 'AlertsChartsPanel';

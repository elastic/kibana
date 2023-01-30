/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { v4 as uuid } from 'uuid';
import React, { useMemo } from 'react';
import { ALERT_SEVERITY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import styled from 'styled-components';
import { useSummaryChartData } from '../../../../components/alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';
import {
  isAlertsBySeverityData,
  getSeverityColor,
} from '../../../../components/alerts_kpis/alerts_summary_charts_panel/severity_level_panel/helpers';
import { FormattedCount } from '../../../../../common/components/formatted_number';

const DETECTIONS_ALERTS_COLLAPSED_CHART_ID = 'detectioin-alerts-collapsed-chart';

const combinedAggregations = (stackByValue: string) => {
  return {
    statusBySeverity: {
      terms: {
        field: ALERT_SEVERITY,
      },
    },
    topRule: {
      terms: {
        field: ALERT_RULE_NAME,
        size: 1,
      },
    },
    topGrouping: {
      terms: {
        field: stackByValue,
        size: 1,
      },
    },
  };
};

const ChartCollapseWrapper = styled.div`
  margin: ${({ theme }) => theme.eui.euiSizeS};
`;

interface Props {
  stackByValue: string;
  filters?: Filter[];
  query?: Query;
  signalIndexName: string | null;
  runtimeMappings?: MappingRuntimeFields;
}

export const ChartCollapse: React.FC<Props> = ({
  stackByValue,
  filters,
  query,
  signalIndexName,
  runtimeMappings,
}: Props) => {
  const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COLLAPSED_CHART_ID}-${uuid()}`, []);

  const { items } = useSummaryChartData({
    aggregations: combinedAggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    uniqueQueryId,
  });
  const data = useMemo(() => (isAlertsBySeverityData(items) ? items : []), [items]);

  return (
    <ChartCollapseWrapper>
      <EuiFlexGroup alignItems="center" component="span">
        <EuiFlexItem>
          <EuiFlexGroup>
            {data.map((severity) => (
              <EuiFlexItem key={severity.key} grow={false}>
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiHealth className="eui-alignMiddle" color={getSeverityColor(severity.key)}>
                      <EuiText size="xs">{`${severity.label}:`}</EuiText>
                    </EuiHealth>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <FormattedCount count={severity.value || 0} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ChartCollapseWrapper>
  );
};

ChartCollapse.displayName = 'ChartCollapse';

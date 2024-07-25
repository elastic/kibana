/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import { ALERT_SEVERITY, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Filter, Query } from '@kbn/es-query';
import { v4 as uuid } from 'uuid';
import { capitalize } from 'lodash';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { GroupBySelection } from '../../alerts_progress_bar_panel/types';
import { getGroupByLabel } from '../../alerts_progress_bar_panel/helpers';
import { InspectButton, InspectButtonContainer } from '../../../../../common/components/inspect';
import { useSummaryChartData } from '../../alerts_summary_charts_panel/use_summary_chart_data';
import { getSeverityColor } from '../../severity_level_panel/helpers';
import { FormattedCount } from '../../../../../common/components/formatted_number';
import { getIsChartCollapseData } from './helpers';
import * as i18n from './translations';

import { SEVERITY_COLOR } from '../../../../../overview/components/detection_response/utils';

const DETECTIONS_ALERTS_COLLAPSED_CHART_ID = 'detectioin-alerts-collapsed-chart';

const combinedAggregations = (groupBySelection: GroupBySelection) => {
  return {
    severities: {
      terms: {
        field: ALERT_SEVERITY,
        min_doc_count: 0,
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
        field: groupBySelection,
        size: 1,
      },
    },
  };
};

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
  @media only screen and (min-width: ${({ theme }) => theme.eui.euiBreakpoints.l});
`;

const SeverityWrapper = styled(EuiFlexItem)`
  min-width: 380px;
`;

const StyledEuiText = styled(EuiText)`
  border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding-left: ${({ theme }) => theme.eui.euiSizeL};
  // allows text to truncate
  max-width: 250px;
`;
interface Props {
  groupBySelection: GroupBySelection;
  filters?: Filter[];
  query?: Query;
  signalIndexName: string | null;
  runtimeMappings?: MappingRuntimeFields;
}

export const ChartCollapse: React.FC<Props> = ({
  groupBySelection,
  filters,
  query,
  signalIndexName,
  runtimeMappings,
}: Props) => {
  const uniqueQueryId = useMemo(() => `${DETECTIONS_ALERTS_COLLAPSED_CHART_ID}-${uuid()}`, []);
  const aggregations = useMemo(() => combinedAggregations(groupBySelection), [groupBySelection]);

  const { items, isLoading } = useSummaryChartData({
    aggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    uniqueQueryId,
  });
  const data = useMemo(() => (getIsChartCollapseData(items) ? items : []), [items]);

  const topRule = useMemo(() => data.at(0)?.rule ?? i18n.NO_RESULT_MESSAGE, [data]);
  const topGroup = useMemo(() => data.at(0)?.group ?? i18n.NO_RESULT_MESSAGE, [data]);
  const severities = useMemo(() => {
    const severityData = data.at(0)?.severities ?? [];
    return Object.keys(SEVERITY_COLOR).map((severity) => {
      const obj = severityData.find((s) => s.key === severity);
      if (obj) {
        return { key: obj.key, label: obj.label, value: obj.value };
      } else {
        return { key: severity, label: capitalize(severity), value: 0 };
      }
    });
  }, [data]);
  const groupBy = useMemo(() => getGroupByLabel(groupBySelection), [groupBySelection]);
  // className="eui-alignMiddle"
  return (
    <InspectButtonContainer>
      {!isLoading && (
        <StyledEuiFlexGroup alignItems="center" data-test-subj="chart-collapse" wrap>
          <SeverityWrapper grow={false}>
            <EuiFlexGroup data-test-subj="chart-collapse-severities">
              {severities.map((severity) => (
                <EuiFlexItem key={severity.key} grow={false}>
                  <EuiHealth color={getSeverityColor(severity.key)}>
                    <EuiText size="xs">
                      {`${severity.label}: `}
                      <FormattedCount count={severity.value || 0} />
                    </EuiText>
                  </EuiHealth>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </SeverityWrapper>
          <EuiFlexItem grow={false}>
            <StyledEuiText
              size="xs"
              className="eui-textTruncate"
              data-test-subj="chart-collapse-top-rule"
            >
              <strong>{i18n.TOP_RULE_TITLE}</strong>
              {topRule}
            </StyledEuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <StyledEuiText
                  size="xs"
                  className="eui-textTruncate"
                  data-test-subj="chart-collapse-top-group"
                >
                  <strong>{`${i18n.TOP_GROUP_TITLE} ${groupBy}: `}</strong>
                  {topGroup}
                </StyledEuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InspectButton
                  isDisabled={false}
                  queryId={uniqueQueryId}
                  title={'chart collapse'}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </StyledEuiFlexGroup>
      )}
    </InspectButtonContainer>
  );
};

ChartCollapse.displayName = 'ChartCollapse';

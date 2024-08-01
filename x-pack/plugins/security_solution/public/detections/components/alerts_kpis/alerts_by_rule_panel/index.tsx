/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChartsPanelProps } from '../alerts_summary_charts_panel/types';
import { AlertsByRule } from './alerts_by_rule';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { alertRuleAggregations } from '../alerts_summary_charts_panel/aggregations';
import { getIsAlertsByRuleData } from './helpers';
import * as i18n from './translations';

const ALERTS_BY_TYPE_CHART_ID = 'alerts-summary-alert_by_type';

export const AlertsByRulePanel: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  skip,
}) => {
  const uniqueQueryId = useMemo(() => `${ALERTS_BY_TYPE_CHART_ID}-${uuid()}`, []);

  const { items, isLoading } = useSummaryChartData({
    aggregations: alertRuleAggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });
  const data = useMemo(() => (getIsAlertsByRuleData(items) ? items : []), [items]);

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="alerts-by-rule-panel">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.ALERTS_RULE_TITLE}
          outerDirection="row"
          title={i18n.ALERTS_RULE_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <AlertsByRule data={data} isLoading={isLoading} />
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsByRulePanel.displayName = 'AlertsByRulePanel';

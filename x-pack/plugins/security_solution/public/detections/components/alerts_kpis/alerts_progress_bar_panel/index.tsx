/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiLoadingSpinner } from '@elastic/eui';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChartsPanelProps } from '../alerts_summary_charts_panel/types';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { StackByComboBox } from '../common/components';
import { AlertsProgressBar } from './alerts_progress_bar';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { alertsGroupingAggregations } from '../alerts_summary_charts_panel/aggregations';
import { showInitialLoadingSpinner } from '../alerts_histogram_panel/helpers';
import { isAlertsProgressBarData } from './helpers';
import * as i18n from './translations';

const TOP_ALERTS_CHART_ID = 'alerts-summary-top-alerts';
const DEFAULT_COMBOBOX_WIDTH = 150;
const DEFAULT_OPTIONS = ['host.name', 'user.name', 'source.ip', 'destination.ip'];

export const AlertsProgressBarPanel: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  skip,
}) => {
  const [stackByField, setStackByField] = useState('host.name');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const uniqueQueryId = useMemo(() => `${TOP_ALERTS_CHART_ID}-${uuid()}`, []);
  const dropDownOptions = DEFAULT_OPTIONS.map((field) => {
    return { value: field, label: field };
  });
  const aggregations = useMemo(() => alertsGroupingAggregations(stackByField), [stackByField]);
  const onSelect = useCallback((field: string) => {
    setStackByField(field);
  }, []);

  const { items, isLoading } = useSummaryChartData({
    aggregationType: 'Top',
    aggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });
  const data = useMemo(() => (isAlertsProgressBarData(items) ? items : []), [items]);
  useEffect(() => {
    if (!showInitialLoadingSpinner({ isInitialLoading, isLoadingAlerts: isLoading })) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading, isLoading, setIsInitialLoading]);

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="alerts-progress-bar-panel">
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={`${i18n.ALERT_BY_TITLE} ${stackByField}`}
          outerDirection="row"
          title={i18n.ALERT_BY_TITLE}
          titleSize="xs"
          hideSubtitle
        >
          <StackByComboBox
            data-test-subj="stackByComboBox"
            selected={stackByField}
            onSelect={onSelect}
            prepend={''}
            width={DEFAULT_COMBOBOX_WIDTH}
            dropDownoptions={dropDownOptions}
          />
        </HeaderSection>
        {isInitialLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <AlertsProgressBar data={data} isLoading={isLoading} stackByField={stackByField} />
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsProgressBarPanel.displayName = 'AlertsProgressBarPanel';

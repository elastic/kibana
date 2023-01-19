/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import uuid from 'uuid';
import type { ChartsPanelProps, AlertsProgressBarData } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { StackByComboBox } from '../../common/components';
// import { useEuiComboBoxReset } from '../../../../../common/components/use_combo_box_reset';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { showInitialLoadingSpinner } from '../../alerts_histogram_panel/helpers';
import { useSummaryChartData } from '../use_summary_chart_data';
import { alertsGroupingAggregations } from '../use_summary_chart_data/aggregations';
import * as i18n from '../translations';

const TOP_ALERTS_CHART_ID = 'alerts-summary-top-alerts';
const DEFAULT_COMBOBOX_WIDTH = 150;
const DEFAULT_OPTIONS = ['host.name', 'user.name', 'source.ip', 'destination.ip'];

const ProgressWrapper = styled.div`
  height: 160px;
`;

const StyledEuiText = styled(EuiText)`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;

export const AlertsProgressBar: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  skip,
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [stackByField, setStackByField] = useState('host.name');
  const uniqueQueryId = useMemo(() => `${TOP_ALERTS_CHART_ID}-${uuid.v4()}`, []);
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

  const data = useMemo(() => (items as AlertsProgressBarData[]) ?? [], [items]);

  useEffect(() => {
    if (!showInitialLoadingSpinner({ isInitialLoading, isLoadingAlerts: isLoading })) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading, isLoading, setIsInitialLoading]);

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false} data-test-subj="top-alerts">
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
        <StyledEuiText size="s">
          <h5>{stackByField}</h5>
        </StyledEuiText>
        <EuiHorizontalRule margin="xs" />
        {!isLoading && data === null && (
          <>
            <EuiText size="s" textAlign="center" data-test-subj="empty-proress-bar">
              {'No items found'}
            </EuiText>
            <EuiHorizontalRule margin="xs" />
          </>
        )}
        {isInitialLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <ProgressWrapper data-test-subj="alerts-progress-bar" className="eui-yScroll">
            {data.map((item) => (
              <>
                <EuiProgress
                  valueText={
                    <EuiText size="xs" color="default">
                      <strong>{`${item.percentage}%`}</strong>
                    </EuiText>
                  }
                  max={100}
                  color={`vis9`}
                  size="s"
                  value={item.percentage}
                  label={
                    item.label === 'Other' ? (
                      item.label
                    ) : (
                      <DefaultDraggable
                        isDraggable={false}
                        field={stackByField}
                        hideTopN={true}
                        id={`top-alerts-${item.key}`}
                        value={item.key}
                        queryValue={item.key}
                        tooltipContent={null}
                      >
                        <EuiText size="xs" className="eui-textTruncate">
                          {item.key}
                        </EuiText>
                      </DefaultDraggable>
                    )
                  }
                />
                <EuiSpacer size="s" />
              </>
            ))}
          </ProgressWrapper>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsProgressBar.displayName = 'AlertsProgressBar';

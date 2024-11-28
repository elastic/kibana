/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useState, useEffect, useCallback } from 'react';
import { useTriggerScan } from '../../../hooks/insights/use_trigger_scan';
import { useFetchOngoingScans } from '../../../hooks/insights/use_fetch_ongoing_tasks';
import { WorkflowInsightsResults } from './workflow_insights_results';
import { WorkflowInsightsScanSection } from './workflow_insights_scan';
import { WORKFLOW_INSIGHTS } from '../../../translations';

interface WorkflowInsightsProps {
  endpointId: string;
}

export const WorkflowInsights = ({ endpointId }: WorkflowInsightsProps) => {
  const [isScanButtonDisabled, setIsScanButtonDisabled] = useState(true);
  const disableScanButton = () => {
    setIsScanButtonDisabled(true);
  };

  const {
    data: ongoingScans,
    isLoading: isLoadingOngoingScans,
    refetch: refetchOngoingScans,
  } = useFetchOngoingScans(isScanButtonDisabled, endpointId);

  const { mutate: triggerScan } = useTriggerScan(refetchOngoingScans, disableScanButton);

  useEffect(() => {
    if ((ongoingScans && ongoingScans.length > 0) || isLoadingOngoingScans) {
      setIsScanButtonDisabled(true);
    } else {
      setIsScanButtonDisabled(false);
    }
  }, [ongoingScans, isLoadingOngoingScans]);

  const results = null; // TODO: Implement this

  const renderLastResultsCaption = () => {
    if (!results) {
      return null;
    }
    return (
      <EuiText color={'subdued'} size={'xs'}>
        {WORKFLOW_INSIGHTS.titleRight}
      </EuiText>
    );
  };

  const onScanButtonClick = useCallback(
    ({ actionTypeId, connectorId }: { actionTypeId: string; connectorId: string }) => {
      triggerScan({ endpointId, actionTypeId, connectorId });
    },
    [triggerScan, endpointId]
  );

  return (
    <>
      <EuiAccordion
        id={'workflow-insights-wrapper'}
        buttonContent={
          <EuiText size={'m'}>
            <h4>{WORKFLOW_INSIGHTS.title}</h4>
          </EuiText>
        }
        initialIsOpen
        extraAction={renderLastResultsCaption()}
        paddingSize={'none'}
      >
        <EuiSpacer size={'m'} />
        <WorkflowInsightsScanSection
          isScanButtonDisabled={isScanButtonDisabled}
          onScanButtonClick={onScanButtonClick}
        />
        <EuiSpacer size={'m'} />
        <WorkflowInsightsResults results={true} />
        <EuiHorizontalRule />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
};

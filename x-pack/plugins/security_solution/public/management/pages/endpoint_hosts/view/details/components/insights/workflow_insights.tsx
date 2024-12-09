/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useState, useEffect, useCallback } from 'react';
import { useFetchInsights } from '../../../hooks/insights/use_fetch_insights';
import { useTriggerScan } from '../../../hooks/insights/use_trigger_scan';
import { useFetchOngoingScans } from '../../../hooks/insights/use_fetch_ongoing_tasks';
import { WorkflowInsightsResults } from './workflow_insights_results';
import { WorkflowInsightsScanSection } from './workflow_insights_scan';
import { WORKFLOW_INSIGHTS } from '../../../translations';

interface WorkflowInsightsProps {
  endpointId: string;
  endpointOs?: string;
}

export const WorkflowInsights = React.memo(({ endpointId, endpointOs }: WorkflowInsightsProps) => {
  const [isScanButtonDisabled, setIsScanButtonDisabled] = useState(true);
  const [scanCompleted, setIsScanCompleted] = useState(false);
  const [userTriggeredScan, setUserTriggeredScan] = useState(false);

  const disableScanButton = () => {
    setIsScanButtonDisabled(true);
  };

  const [setScanOngoing, setScanCompleted] = [
    () => setIsScanCompleted(false),
    () => setIsScanCompleted(true),
  ];

  const { data: insights, refetch: refetchInsights } = useFetchInsights({
    endpointId,
    onSuccess: setScanCompleted,
  });

  const {
    data: ongoingScans,
    isLoading: isLoadingOngoingScans,
    refetch: refetchOngoingScans,
  } = useFetchOngoingScans({
    endpointId,
    isPolling: isScanButtonDisabled,
    onSuccess: refetchInsights,
  });

  const { mutate: triggerScan } = useTriggerScan({
    onSuccess: refetchOngoingScans,
    onMutate: disableScanButton,
  });

  useEffect(() => {
    setIsScanButtonDisabled(!!ongoingScans?.length || isLoadingOngoingScans);
  }, [ongoingScans, isLoadingOngoingScans]);

  const renderLastResultsCaption = () => {
    // TODO: get the last scan date from the insights data
    // TODO: Format the date
    if (!insights?.length || !insights[0]['@timestamp']) {
      return null;
    }
    return (
      <EuiText color={'subdued'} size={'xs'}>
        {`${WORKFLOW_INSIGHTS.titleRight}${insights[0]['@timestamp']}`}
      </EuiText>
    );
  };

  const onScanButtonClick = useCallback(
    ({ actionTypeId, connectorId }: { actionTypeId: string; connectorId: string }) => {
      setScanOngoing();
      if (!userTriggeredScan) {
        setUserTriggeredScan(true);
      }
      triggerScan({ endpointId, actionTypeId, connectorId });
    },
    [setScanOngoing, userTriggeredScan, triggerScan, endpointId]
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
        <WorkflowInsightsResults
          results={insights}
          scanCompleted={scanCompleted && userTriggeredScan}
          endpointId={endpointId}
          endpointOs={endpointOs}
        />
        <EuiHorizontalRule />
      </EuiAccordion>
      <EuiSpacer size="l" />
    </>
  );
});

WorkflowInsights.displayName = 'WorkflowInsights';

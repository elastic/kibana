/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { GlobalWidgetParameters, WidgetRenderAPI } from '@kbn/investigate-plugin/public';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useEffect, useRef } from 'react';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { TransactionDurationRuleParams } from '.';
import { PROCESSOR_EVENT } from '../../../../../common/es_fields/apm';
import { useApmIndicesFetcher } from '../../../../hooks/use_apm_indices_fetcher';
import { isPending } from '../../../../hooks/use_fetcher';
import { getGroupingKeysFromAlert } from '../get_grouping_keys_from_alert';
import { getLogRateAnalysisWorkflowBlock } from '../get_log_rate_analysis_workflow_block';
import { getViewServiceDetailWorkflowBlock } from '../get_view_service_detail_workflow_block';

function TransactionDurationRuleTypeSourceDataChart({
  alert,
  start,
  end,
}: {
  alert: TopAlert<Record<string, any>>;
  start: string;
  end: string;
}) {
  return <></>;
}

export function TransactionDurationInvestigateDetailsAppSection({
  alert,
  rule,
  timeRange,
  blocks,
  onWidgetAdd,
}: {
  alert: TopAlert<Record<string, any>>;
  rule: Rule<TransactionDurationRuleParams>;
} & GlobalWidgetParameters &
  Pick<WidgetRenderAPI, 'blocks' | 'onWidgetAdd'>) {
  const onWidgetAddRef = useRef(onWidgetAdd);

  const { status: apmIndicesStatus, data: apmIndicesData } = useApmIndicesFetcher();

  useEffect(() => {
    const { filters } = getGroupingKeysFromAlert({
      alert,
      rule,
    });

    return blocks.publish([
      getViewServiceDetailWorkflowBlock({
        alert,
        onWidgetAdd: (create) => {
          return onWidgetAddRef.current(create);
        },
      }),
      getLogRateAnalysisWorkflowBlock({
        alert,
        onWidgetAdd: (create) => {
          return onWidgetAddRef.current(create);
        },
        query: {
          bool: {
            filter: [{ term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } }, ...filters],
          },
        },
        loading: isPending(apmIndicesStatus),
        indexPattern: apmIndicesData?.transaction,
      }),
    ]);
  }, [blocks, alert, apmIndicesData?.transaction, apmIndicesStatus, rule]);

  return (
    <TransactionDurationRuleTypeSourceDataChart
      alert={alert}
      start={timeRange.from}
      end={timeRange.to}
    />
  );
}

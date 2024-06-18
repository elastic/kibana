/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { GlobalWidgetParameters, WidgetRenderAPI } from '@kbn/investigate-plugin/public';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useEffect, useRef } from 'react';
import type { ErrorCountRuleParams } from '.';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { useApmIndicesFetcher } from '../../../../hooks/use_apm_indices_fetcher';
import { useErrorGroupDistributionFetcher } from '../../../../hooks/use_error_group_distribution_fetcher';
import { isPending } from '../../../../hooks/use_fetcher';
import { ErrorDistribution } from '../../../app/error_group_details/distribution';
import { getGroupingKeysFromAlert } from '../get_grouping_keys_from_alert';
import { getLogRateAnalysisWorkflowBlock } from '../get_log_rate_analysis_workflow_block';
import { getViewServiceDetailWorkflowBlock } from '../get_view_service_detail_workflow_block';

function ErrorCountRuleTypeSourceDataChart({
  alert,
  start,
  end,
}: {
  alert: TopAlert<Record<string, any>>;
  start: string;
  end: string;
}) {
  const serviceName: string = alert.fields[SERVICE_NAME];
  const environment: string = alert.fields[SERVICE_ENVIRONMENT];

  const { errorDistributionData, errorDistributionStatus } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
    environment,
    kuery: '',
    start,
    end,
    comparisonEnabled: false,
    offset: undefined,
  });

  return (
    <ErrorDistribution
      comparisonEnabled={false}
      previousPeriodLabel=""
      fetchStatus={errorDistributionStatus}
      distribution={errorDistributionData}
      title={i18n.translate('xpack.apm.errorCountRuleTypeSourceDataChart.title', {
        defaultMessage: 'Error distribution',
      })}
    />
  );
}

export function ErrorRateInvestigateDetailsAppSection({
  alert,
  rule,
  timeRange,
  blocks,
  onWidgetAdd,
}: {
  alert: TopAlert<Record<string, any>>;
  rule: Rule<ErrorCountRuleParams>;
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
            filter: filters,
          },
        },
        loading: isPending(apmIndicesStatus),
        indexPattern: apmIndicesData?.error,
      }),
    ]);
  }, [blocks, alert, rule, apmIndicesData?.error, apmIndicesStatus]);

  return (
    <ErrorCountRuleTypeSourceDataChart alert={alert} start={timeRange.from} end={timeRange.to} />
  );
}

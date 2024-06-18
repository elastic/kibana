/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { OnWidgetAdd, WorkflowBlock } from '@kbn/investigate-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  ALERT_RULE_NAME,
  ALERT_UUID,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  createInvestigateAlertLogRateAnalysisWidget,
  TopAlert,
} from '@kbn/observability-plugin/public';

export function getLogRateAnalysisWorkflowBlock({
  alert,
  query,
  loading,
  indexPattern,
  onWidgetAdd,
}: {
  alert?: TopAlert<Record<string, any>>;
  query?: QueryDslQueryContainer;
  loading: boolean;
  indexPattern?: string;
  onWidgetAdd: OnWidgetAdd;
}): WorkflowBlock {
  const ruleName = alert?.fields[ALERT_RULE_NAME];
  const alertUuid = alert?.fields[ALERT_UUID];
  return {
    id: 'log_rate_analysis',
    loading,
    content: i18n.translate('xpack.apm.alertTypes.logRateAnalysisWorkflowBlockTitle', {
      defaultMessage: 'Analyze log rates',
    }),
    ...(ruleName && alertUuid && indexPattern && query
      ? {
          onClick: () => {
            onWidgetAdd(
              createInvestigateAlertLogRateAnalysisWidget({
                title: i18n.translate('xpack.apm.alertTypes.logRateAnalysisWidgetTitle', {
                  defaultMessage: 'Log rate analysis for {ruleName}',
                  values: {
                    ruleName,
                  },
                }),
                parameters: {
                  alertUuid: alert.fields[ALERT_UUID],
                  logRateQuery: query,
                  indexPattern,
                },
              })
            );
          },
        }
      : {}),
  };
}

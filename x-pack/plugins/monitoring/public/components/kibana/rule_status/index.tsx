/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { SummaryStatus } from '../../summary_status';
// @ts-ignore
import { KibanaStatusIcon } from '../status_icon';
// @ts-ignore
import { formatMetric } from '../../../lib/format_number';
import { ElasticsearchSourceKibanaMetrics } from '../../../../common/types/es';

interface Props {
  rule: ElasticsearchSourceKibanaMetrics['rule'];
}

export const RuleStatus: React.FC<Props> = ({ rule }) => {
  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.kibana.ruleStatus.averageDriftLabel', {
        defaultMessage: 'Average drift',
      }),
      value: formatMetric(rule?.averageDrift, 'duration'),
      'data-test-subj': 'averageDrift',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.ruleStatus.averageDurationLabel', {
        defaultMessage: 'Average duration',
      }),
      value: formatMetric(rule?.averageDuration, 'duration'),
      'data-test-subj': 'averageDuration',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.ruleStatus.lastExecutionDurationLabel', {
        defaultMessage: 'Last execution duration',
      }),
      value: formatMetric(rule?.lastExecutionDuration, 'duration'),
      'data-test-subj': 'lastExecutionDuration',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.ruleStatus.totalExecutionsLabel', {
        defaultMessage: 'Total executions',
      }),
      value: formatMetric(rule?.totalExecutions, 'int_commas'),
      'data-test-subj': 'totalExecutions',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.ruleStatus.lastExecutionTimeoutLabel', {
        defaultMessage: 'Last execution timeout',
      }),
      value: rule?.lastExecutionTimeout ? formatMetric(rule?.lastExecutionTimeout, 'time') : 'N/A',
      'data-test-subj': 'lastExecutionTimeout',
    },
  ];

  return <SummaryStatus metrics={metrics} data-test-subj="kibanaRuleStatus" />;
};

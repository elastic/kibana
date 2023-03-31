/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ALERT_DURATION, ALERT_END } from '@kbn/rule-data-utils';
import moment from 'moment';
import React from 'react';
import { type PartialCriterion } from '../../../../../common/alerting/logs/log_threshold';
import { CriterionPreview } from '../expression_editor/criterion_preview_chart';
import { AlertAnnotation } from './components/alert_annotation';
import { AlertDetailsAppSectionProps } from './types';

const LogsHistoryChart = React.lazy(() => import('./components/logs_history_chart'));

const AlertDetailsAppSection = ({ rule, alert }: AlertDetailsAppSectionProps) => {
  const ruleWindowSizeMS = moment
    .duration(rule.params.timeSize, rule.params.timeUnit)
    .asMilliseconds();
  const alertDurationMS = alert.fields[ALERT_DURATION]! / 1000;
  const TWENTY_TIMES_RULE_WINDOW_MS = 20 * ruleWindowSizeMS;
  /**
   * This is part or the requirements (RFC).
   * If the alert is less than 20 units of `FOR THE LAST <x> <units>` then we should draw a time range of 20 units.
   * IE. The user set "FOR THE LAST 5 minutes" at a minimum we should show 100 minutes.
   */
  const rangeFrom =
    alertDurationMS < TWENTY_TIMES_RULE_WINDOW_MS
      ? Number(moment(alert.start).subtract(TWENTY_TIMES_RULE_WINDOW_MS, 'millisecond').format('x'))
      : Number(moment(alert.start).subtract(ruleWindowSizeMS, 'millisecond').format('x'));

  const rangeTo = alert.active
    ? Date.now()
    : Number(moment(alert.fields[ALERT_END]).add(ruleWindowSizeMS, 'millisecond').format('x'));

  return (
    // Create a chart per-criteria
    <EuiFlexGroup direction="column">
      {rule.params.criteria.map((criteria, idx) => {
        const chartCriterion = criteria as PartialCriterion;
        return (
          <EuiFlexItem key={`${chartCriterion.field}${idx}`}>
            <CriterionPreview
              ruleParams={rule.params}
              logViewReference={{
                type: 'log-view-reference',
                logViewId: rule.params.logView.logViewId,
              }}
              chartCriterion={chartCriterion}
              showThreshold={true}
              executionTimeRange={{ gte: rangeFrom, lte: rangeTo }}
              annotations={[<AlertAnnotation alertStarted={alert.start} />]}
            />
          </EuiFlexItem>
        );
      })}
      {/* For now we show the history chart only if we have one criteria */}
      {rule.params.criteria.length === 1 && (
        <EuiFlexItem>
          <LogsHistoryChart alert={alert} rule={rule} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;

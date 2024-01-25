/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Rule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import {
  ALERT_END,
  ALERT_START,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
  TAGS,
} from '@kbn/rule-data-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { useLicense } from '../../../../hooks/use_license';
import { useKibana } from '../../../../utils/kibana_react';
import { metricValueFormatter } from '../../../../../common/custom_threshold_rule/metric_value_formatter';
import { AlertSummaryField, TopAlert } from '../../../..';
import {
  AlertParams,
  CustomThresholdAlertFields,
  CustomThresholdRuleTypeParams,
} from '../../types';
import { TIME_LABELS } from '../criterion_preview_chart/criterion_preview_chart';
import { Threshold } from '../custom_threshold';
import { LogRateAnalysis } from './log_rate_analysis';
import { Groups } from './groups';
import { Tags } from './tags';
import { RuleConditionChart } from '../rule_condition_chart/rule_condition_chart';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type CustomThresholdRule = Rule<CustomThresholdRuleTypeParams>;
export type CustomThresholdAlert = TopAlert<CustomThresholdAlertFields>;

interface AppSectionProps {
  alert: CustomThresholdAlert;
  rule: CustomThresholdRule;
  ruleLink: string;
  setAlertSummaryFields: React.Dispatch<React.SetStateAction<AlertSummaryField[] | undefined>>;
}

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsAppSection({
  alert,
  rule,
  ruleLink,
  setAlertSummaryFields,
}: AppSectionProps) {
  const services = useKibana().services;
  const { charts, data } = services;
  const { hasAtLeast } = useLicense();
  const hasLogRateAnalysisLicense = hasAtLeast('platinum');
  const [dataView, setDataView] = useState<DataView>();
  const [, setDataViewError] = useState<Error>();
  const ruleParams = rule.params as RuleTypeParams & AlertParams;
  const chartProps = {
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
  const timeRange = getPaddedAlertTimeRange(alert.fields[ALERT_START]!, alert.fields[ALERT_END]);

  useEffect(() => {
    const groups = alert.fields[ALERT_GROUP];
    const tags = alert.fields[TAGS];
    const alertSummaryFields = [];
    if (groups) {
      alertSummaryFields.push({
        label: i18n.translate(
          'xpack.observability.customThreshold.rule.alertDetailsAppSection.summaryField.source',
          {
            defaultMessage: 'Source',
          }
        ),
        value: <Groups groups={groups} />,
      });
    }
    if (tags && tags.length > 0) {
      alertSummaryFields.push({
        label: i18n.translate(
          'xpack.observability.customThreshold.rule.alertDetailsAppSection.summaryField.tags',
          {
            defaultMessage: 'Tags',
          }
        ),
        value: <Tags tags={tags} />,
      });
    }
    alertSummaryFields.push({
      label: i18n.translate(
        'xpack.observability.customThreshold.rule.alertDetailsAppSection.summaryField.rule',
        {
          defaultMessage: 'Rule',
        }
      ),
      value: (
        <EuiLink data-test-subj="thresholdRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
          {rule.name}
        </EuiLink>
      ),
    });

    setAlertSummaryFields(alertSummaryFields);
  }, [alert, rule, ruleLink, setAlertSummaryFields]);

  const filterQuery = useMemo<string>(() => {
    let query = `(${(ruleParams.searchConfiguration?.query as Query)?.query as string})`;
    const groups = alert.fields[ALERT_GROUP] as Array<{ field: string; value: string }>;
    groups.forEach(({ field, value }) => {
      query += ` and ${field}: ${value}`;
    });
    return query;
  }, [ruleParams.searchConfiguration, alert.fields]);

  useEffect(() => {
    const initDataView = async () => {
      const ruleSearchConfiguration = ruleParams.searchConfiguration;
      try {
        const createdSearchSource = await data.search.searchSource.create(ruleSearchConfiguration);
        setDataView(createdSearchSource.getField('index'));
      } catch (error) {
        setDataViewError(error);
      }
    };

    initDataView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource]);

  const overview = !!ruleParams.criteria ? (
    <EuiFlexGroup direction="column" data-test-subj="thresholdAlertOverviewSection">
      {ruleParams.criteria.map((criterion, index) => (
        <EuiFlexItem key={`criterion-${index}`}>
          <EuiPanel hasBorder hasShadow={false}>
            <EuiTitle size="xs">
              <h4>{criterion.label || 'CUSTOM'} </h4>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.customThreshold.rule.alertDetailsAppSection.criterion.subtitle"
                defaultMessage="Last {lookback} {timeLabel}"
                values={{
                  lookback: criterion.timeSize,
                  timeLabel: TIME_LABELS[criterion.timeUnit as keyof typeof TIME_LABELS],
                }}
              />
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem style={{ minHeight: 150, minWidth: 160 }} grow={1}>
                <Threshold
                  chartProps={chartProps}
                  id={`threshold-${index}`}
                  threshold={criterion.threshold}
                  value={alert.fields[ALERT_EVALUATION_VALUES]![index]}
                  valueFormatter={(d) =>
                    metricValueFormatter(
                      d,
                      criterion.metrics[0] ? criterion.metrics[0].name : undefined
                    )
                  }
                  title={i18n.translate(
                    'xpack.observability.customThreshold.rule.alertDetailsAppSection.thresholdTitle',
                    {
                      defaultMessage: 'Threshold breached',
                    }
                  )}
                  comparator={criterion.comparator}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={5}>
                <RuleConditionChart
                  metricExpression={criterion}
                  dataView={dataView}
                  filterQuery={filterQuery}
                  groupBy={ruleParams.groupBy}
                  annotation={{
                    timestamp: alert.fields[ALERT_START],
                    endTimestamp: alert.fields[ALERT_END],
                  }}
                  timeRange={timeRange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ))}
      {hasLogRateAnalysisLicense && (
        <LogRateAnalysis alert={alert} dataView={dataView} rule={rule} services={services} />
      )}
    </EuiFlexGroup>
  ) : null;

  return overview;
}

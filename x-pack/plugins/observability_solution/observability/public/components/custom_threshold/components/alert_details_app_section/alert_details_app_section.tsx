/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  transparentize,
} from '@elastic/eui';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import {
  ALERT_END,
  ALERT_START,
  ALERT_EVALUATION_VALUES,
  ALERT_GROUP,
  TAGS,
} from '@kbn/rule-data-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import type {
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import moment from 'moment';
import { LOGS_EXPLORER_LOCATOR_ID, LogsExplorerLocatorParams } from '@kbn/deeplinks-observability';
import { TimeRange } from '@kbn/es-query';
import { AlertHistoryChart } from './alert_history';
import { useLicense } from '../../../../hooks/use_license';
import { useKibana } from '../../../../utils/kibana_react';
import { getGroupFilters } from '../../../../../common/custom_threshold_rule/helpers/get_group';
import { metricValueFormatter } from '../../../../../common/custom_threshold_rule/metric_value_formatter';
import { AlertSummaryField } from '../../../..';
import { AlertParams } from '../../types';
import { TIME_LABELS } from '../criterion_preview_chart/criterion_preview_chart';
import { Threshold } from '../custom_threshold';
import { CustomThresholdRule, CustomThresholdAlert } from '../types';
import { LogRateAnalysis } from './log_rate_analysis';
import { Groups } from './groups';
import { Tags } from './tags';
import { RuleConditionChart } from '../rule_condition_chart/rule_condition_chart';
import { getViewInAppUrl } from '../../../../../common/custom_threshold_rule/get_view_in_app_url';
import { SearchConfigurationWithExtractedReferenceType } from '../../../../../common/custom_threshold_rule/types';
import { generateChartTitleAndTooltip } from './helpers/generate_chart_title_and_tooltip';

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
  const {
    charts,
    data,
    share: {
      url: { locators },
    },
  } = services;
  const { hasAtLeast } = useLicense();
  const { euiTheme } = useEuiTheme();
  const hasLogRateAnalysisLicense = hasAtLeast('platinum');
  const [dataView, setDataView] = useState<DataView>();
  const [, setDataViewError] = useState<Error>();
  const [viewInAppUrl, setViewInAppUrl] = useState<string>();
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const ruleParams = rule.params as RuleTypeParams & AlertParams;
  const chartProps = {
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const groups = alert.fields[ALERT_GROUP];
  const tags = alert.fields[TAGS];

  const chartTitleAndTooltip: Array<{ title: string; tooltip: string }> = [];

  ruleParams.criteria.forEach((criterion) => {
    chartTitleAndTooltip.push(generateChartTitleAndTooltip(criterion));
  });

  const alertStartAnnotation: PointInTimeEventAnnotationConfig = {
    label: 'Alert',
    type: 'manual',
    key: {
      type: 'point_in_time',
      timestamp: alertStart!,
    },
    color: euiTheme.colors.danger,
    icon: 'alert',
    id: 'custom_threshold_alert_start_annotation',
  };

  const alertRangeAnnotation: RangeEventAnnotationConfig = {
    label: `${alertEnd ? 'Alert duration' : 'Active alert'}`,
    type: 'manual',
    key: {
      type: 'range',
      timestamp: alertStart!,
      endTimestamp: alertEnd ?? moment().toISOString(),
    },
    color: chroma(transparentize('#F04E981A', 0.2)).hex().toUpperCase(),
    id: `custom_threshold_${alertEnd ? 'recovered' : 'active'}_alert_range_annotation`,
  };

  const annotations: EventAnnotationConfig[] = [];
  annotations.push(alertStartAnnotation, alertRangeAnnotation);

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  useEffect(() => {
    const appUrl = getViewInAppUrl({
      dataViewId: dataView?.id,
      groups,
      logsExplorerLocator: locators.get<LogsExplorerLocatorParams>(LOGS_EXPLORER_LOCATOR_ID),
      metrics: ruleParams.criteria[0]?.metrics,
      searchConfiguration:
        ruleParams.searchConfiguration as SearchConfigurationWithExtractedReferenceType,
      startedAt: alertStart,
      endedAt: alertEnd,
    });

    setViewInAppUrl(appUrl);
  }, [dataView, alertStart, alertEnd, groups, ruleParams, locators]);

  useEffect(() => {
    const alertSummaryFields = [];
    if (groups) {
      alertSummaryFields.push({
        label: i18n.translate(
          'xpack.observability.customThreshold.rule.alertDetailsAppSection.summaryField.source',
          {
            defaultMessage: 'Source',
          }
        ),
        value: (
          <>
            <Groups
              groups={groups}
              timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }}
            />
            <span>
              <EuiLink
                data-test-subj="o11yCustomThresholdAlertDetailsViewRelatedLogs"
                href={viewInAppUrl}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.observability.alertDetailsAppSection.a.viewRelatedLogsLabel',
                  {
                    defaultMessage: 'View related logs',
                  }
                )}
              </EuiLink>
            </span>
          </>
        ),
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
  }, [groups, tags, rule, ruleLink, setAlertSummaryFields, timeRange, alertEnd, viewInAppUrl]);

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
            <EuiToolTip content={chartTitleAndTooltip[index].tooltip}>
              <EuiTitle size="xs">
                <h4 data-test-subj={`chartTitle-${index}`}>{chartTitleAndTooltip[index].title}</h4>
              </EuiTitle>
            </EuiToolTip>
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
                  additionalFilters={getGroupFilters(groups)}
                  annotations={annotations}
                  chartOptions={{
                    // For alert details page, the series type needs to be changed to 'bar_stacked'
                    // due to https://github.com/elastic/elastic-charts/issues/2323
                    seriesType: 'bar_stacked',
                  }}
                  dataView={dataView}
                  groupBy={ruleParams.groupBy}
                  metricExpression={criterion}
                  searchConfiguration={ruleParams.searchConfiguration}
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
      <AlertHistoryChart alert={alert} dataView={dataView} rule={rule} />
    </EuiFlexGroup>
  ) : null;

  return overview;
}

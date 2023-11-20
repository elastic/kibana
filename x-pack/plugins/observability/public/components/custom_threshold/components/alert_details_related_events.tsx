/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { ChangePointAnnotation } from '@kbn/aiops-plugin/public/components/change_point_detection/change_point_detection_context';
import { ALERT_GROUP } from '@kbn/rule-data-utils';
import { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../utils/kibana_react';

import { AlertParams, MetricExpression } from '../types';
import { CustomThresholdAlert, CustomThresholdRule } from './alert_details_app_section';

const cpuMetricPrefix = 'system.cpu';
const memoryMetricPrefix = 'system.memory';
const predefinedMetrics = [
  'system.cpu.user.pct',
  'system.load.1',
  'system.memory.actual.used.pct',
  'system.filesystem.used.pct',
  'host.network.ingress.bytes',
  'host.network.egress.bytes',
];
const fnList = ['avg', 'sum', 'min', 'max'];

interface AlertDetailsRelatedEventsProps {
  alert: CustomThresholdAlert;
  rule: CustomThresholdRule;
  dataView?: DataView;
}

const emptyState = <></>;

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsRelatedEvents({
  alert,
  rule,
  dataView,
}: AlertDetailsRelatedEventsProps) {
  const { aiops } = useKibana().services;
  const { EmbeddableChangePointChart } = aiops;
  const [relatedMetrics, setRelatedMetrics] = useState<Array<string | undefined>>([]);
  const [metricAggType, setMetricAggType] = useState<string>();
  const [lastReloadRequestTime, setLastReloadRequestTime] = useState<number>();
  const ruleParams = rule.params as RuleTypeParams & AlertParams;

  const relatedEventsFilter = ruleParams.groupBy
    ? [...ruleParams.groupBy]
        .map((groupByField) => {
          const groupByValue = (
            alert.fields[ALERT_GROUP] as Array<{ field: string; value: string }>
          )?.find((fieldObj) => fieldObj.field === groupByField)?.value;
          return groupByValue ? { term: { [groupByField]: groupByValue } } : null;
        })
        .filter((termFilter) => termFilter)
    : [];

  let changePointDataAll: ChangePointAnnotation[] = predefinedMetrics.map((metricName) => {
    return {
      metricField: metricName,
    } as ChangePointAnnotation;
  });

  const isCpuOrMemoryCriterion = (criterion: MetricExpression) =>
    criterion.metrics?.some(
      (metric: CustomThresholdExpressionMetric) =>
        metric.field?.includes(cpuMetricPrefix) ||
        metric.field?.includes(memoryMetricPrefix) ||
        predefinedMetrics.includes(metric.field ?? '')
    );

  const relatedMetricsPerCriteria = useCallback(() => {
    const hasCpuOrMemoryCriteria = ruleParams.criteria.some((criterion) =>
      isCpuOrMemoryCriterion(criterion)
    );

    const relatedMetricsInDataView = hasCpuOrMemoryCriteria
      ? dataView?.fields
          .map((field) => field.name)
          .filter((fieldName) => predefinedMetrics.includes(fieldName))
      : [];

    const aggType = ruleParams.criteria
      .find((criterion) => isCpuOrMemoryCriterion(criterion))
      ?.metrics?.find(
        (metric) =>
          metric.field?.includes(cpuMetricPrefix) ||
          metric.field?.includes(memoryMetricPrefix) ||
          predefinedMetrics.includes(metric.field ?? '')
      )?.aggType;

    setRelatedMetrics(relatedMetricsInDataView ?? []);
    setMetricAggType(aggType ? (fnList.includes(aggType) ? aggType : undefined) : undefined);
  }, [dataView, ruleParams.criteria]);

  useEffect(() => {
    relatedMetricsPerCriteria();
  }, [relatedMetricsPerCriteria]);

  const relatedEventsTimeRangeEnd = moment(alert.start).add(
    (ruleParams.criteria[0].timeSize ?? 5) * 2,
    ruleParams.criteria[0].timeUnit ?? 'minutes'
  );

  const relatedEventsTimeRange = (): TimeRange => {
    return {
      from: moment(alert.start)
        .subtract(
          (ruleParams.criteria[0].timeSize ?? 5) * 2,
          ruleParams.criteria[0].timeUnit ?? 'minutes'
        )
        .toISOString(),
      to:
        relatedEventsTimeRangeEnd.valueOf() > moment.now()
          ? moment().toISOString()
          : relatedEventsTimeRangeEnd.toISOString(),
      mode: 'absolute',
    };
  };

  const sortByTime = () => {
    const sortedMetrics = changePointDataAll
      .filter((cp) => cp.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((cpItem) => cpItem.metricField);

    if (sortedMetrics.length > 0) setRelatedMetrics(sortedMetrics);
  };

  const onRefresh = () => {
    relatedMetricsPerCriteria();
    setLastReloadRequestTime(moment(new Date()).valueOf());
  };

  const onChangePointDataChange = (changePointData: ChangePointAnnotation[]) => {
    if (changePointData.length > 0) {
      changePointDataAll = changePointDataAll.map((changePoint) => {
        if (changePoint.metricField === changePointData[0].metricField) {
          return {
            ...changePointData[0],
          };
        }
        return changePoint;
      });
    }
  };

  const relatedEventsTab =
    !!ruleParams.criteria && relatedMetrics.length > 0 && metricAggType ? (
      <>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="row" justifyContent="flexEnd" gutterSize="xs">
          <EuiButton data-test-subj="o11yAlertDetailsRelatedEventsSortButton" onClick={sortByTime}>
            {i18n.translate('xpack.observability.alertDetailsRelatedEvents.sortButtonLabel', {
              defaultMessage: 'Sort by time',
            })}
          </EuiButton>
          <EuiButton
            data-test-subj="o11yAlertDetailsRelatedEventsRefreshButton"
            onClick={onRefresh}
          >
            {i18n.translate('xpack.observability.alertDetailsRelatedEvents.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButton>
        </EuiFlexGroup>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          data-test-subj="thresholdAlertRelatedEventsSection"
        >
          {relatedMetrics?.map(
            (relatedMetric, relatedMetricIndex) =>
              dataView &&
              dataView.id &&
              relatedMetric && (
                <EmbeddableChangePointChart
                  id={`relatedMetric${relatedMetricIndex}`}
                  key={`relatedMetric${relatedMetricIndex}`}
                  dataViewId={dataView.id}
                  timeRange={relatedEventsTimeRange()}
                  fn={metricAggType}
                  metricField={relatedMetric}
                  emptyState={emptyState}
                  onChange={onChangePointDataChange}
                  relatedEventsStyle={{ 'margin-top': '10px' }}
                  lastReloadRequestTime={lastReloadRequestTime}
                  relatedEventsFilter={relatedEventsFilter}
                />
              )
          )}
        </EuiFlexGroup>
      </>
    ) : null;

  return relatedEventsTab;
}

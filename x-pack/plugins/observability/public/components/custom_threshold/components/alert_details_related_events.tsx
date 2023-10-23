/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import { ChangePointAnnotation } from '@kbn/aiops-plugin/public/components/change_point_detection/change_point_detection_context';
import { CustomThresholdExpressionMetric } from '../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../utils/kibana_react';

import { AlertParams, MetricExpression } from '../types';
import { RelatedEventsSortBar, SortField } from './alert_details_related_events_sort_bar';
import { MetricThresholdAlert, MetricThresholdRule } from './alert_details_app_section';

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
  alert: MetricThresholdAlert;
  rule: MetricThresholdRule;
  dataView?: DataView;
}

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsRelatedEvents({
  alert,
  rule,
  dataView,
}: AlertDetailsRelatedEventsProps) {
  const { aiops } = useKibana().services;
  const { EmbeddableChangePointChart } = aiops;
  const [relatedMetrics, setRelatedMetrics] = useState<Array<string | undefined>>([]);
  const [metricAggType, setMetricAggType] = useState<string>('avg');
  const [lastReloadRequestTime, setLastReloadRequestTime] = useState<number>();
  const ruleParams = rule.params as RuleTypeParams & AlertParams;

  let changePointDataAll: ChangePointAnnotation[] = predefinedMetrics.map((metricName) => {
    return {
      metricField: metricName,
    } as ChangePointAnnotation;
  });

  useEffect(() => {
    const isCpuOrMemoryCriterion = (criterion: MetricExpression) =>
      criterion.metrics?.some(
        (metric: CustomThresholdExpressionMetric) =>
          metric.field?.includes(cpuMetricPrefix) || metric.field?.includes(memoryMetricPrefix)
      );

    const relatedMetricsPerCriteria = () => {
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
            metric.field?.includes(cpuMetricPrefix) || metric.field?.includes(memoryMetricPrefix)
        )?.aggType;

      setRelatedMetrics(relatedMetricsInDataView ?? []);
      setMetricAggType(aggType ? (fnList.includes(aggType) ? aggType : 'avg') : 'avg');
    };

    relatedMetricsPerCriteria();
  }, [dataView, ruleParams.criteria]);

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

    setRelatedMetrics(sortedMetrics);
  };

  const sortByPValue = () => {
    const sortedMetrics = changePointDataAll
      .sort((a, b) => a.p_value - b.p_value)
      .map((cpItem) => cpItem.metricField);

    setRelatedMetrics(sortedMetrics);
  };

  const onChangeSort = (type: SortField | undefined) => {
    if (type === 'time') {
      sortByTime();
    } else if (type === 'p_value') {
      sortByPValue();
    }
  };

  const onRefresh = () => {
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

  const emptyState = () => <></>;

  const relatedEventsTab = !!ruleParams.criteria ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" justifyContent="flexEnd" gutterSize="xs">
        <EuiFlexItem grow={true} style={{ maxWidth: 150 }}>
          <RelatedEventsSortBar loading={false} onChangeSort={onChangeSort} />
        </EuiFlexItem>
        <EuiButton data-test-subj="o11yAlertDetailsRelatedEventsRefreshButton" onClick={onRefresh}>
          Refresh
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
                fn={metricAggType || 'avg'}
                metricField={relatedMetric}
                emptyState={emptyState}
                onChange={onChangePointDataChange}
                style={{ marginTop: 10 }}
                lastReloadRequestTime={lastReloadRequestTime}
              />
            )
        )}
      </EuiFlexGroup>
    </>
  ) : null;

  return relatedEventsTab;
}

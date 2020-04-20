/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, useCallback, useMemo, useEffect, useState } from 'react';
import { EuiFieldSearch, EuiSpacer, EuiText, EuiFormRow, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  Comparator,
  Aggregators,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import {
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricsExplorerGroupBy } from '../../../pages/metrics/metrics_explorer/components/group_by';
import { useSourceViaHttp } from '../../../containers/source/use_source_via_http';
import { ExpressionRow } from './expression_row';
import { MetricThresholdAlertParams, AlertContextMeta, TimeUnit, MetricExpression } from '../types';
import { useMetricsExplorerChartData } from '../hooks/use_metrics_explorer_chart_data';
import { ExpressionChart } from './expression_chart';

interface Props {
  errors: IErrorObject[];
  alertParams: MetricThresholdAlertParams;
  alertsContext: AlertsContextValue<AlertContextMeta>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

const defaultExpression = {
  aggType: Aggregators.AVERAGE,
  comparator: Comparator.GT,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as MetricExpression;

export const Expressions: React.FC<Props> = props => {
  const { setAlertParams, alertParams, errors, alertsContext } = props;
  const { source, createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    type: 'metrics',
    fetch: alertsContext.http.fetch,
    toastWarning: alertsContext.toastNotifications.addWarning,
  });
  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('m');
  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);

  const chartData = useMetricsExplorerChartData(
    alertParams,
    alertsContext,
    derivedIndexPattern,
    source
  );

  const options = useMemo<MetricsExplorerOptions>(() => {
    if (alertsContext.metadata?.currentOptions?.metrics) {
      return alertsContext.metadata.currentOptions as MetricsExplorerOptions;
    } else {
      return {
        metrics: [],
        aggregation: 'avg',
      };
    }
  }, [alertsContext.metadata]);

  const updateParams = useCallback(
    (id, e: MetricExpression) => {
      const exp = alertParams.criteria ? alertParams.criteria.slice() : [];
      exp[id] = { ...exp[id], ...e };
      setAlertParams('criteria', exp);
    },
    [setAlertParams, alertParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = alertParams.criteria?.slice() || [];
    exp.push(defaultExpression);
    setAlertParams('criteria', exp);
  }, [setAlertParams, alertParams.criteria]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = alertParams.criteria?.slice() || [];
      if (exp.length > 1) {
        exp.splice(id, 1);
        setAlertParams('criteria', exp);
      }
    },
    [setAlertParams, alertParams.criteria]
  );

  const onFilterQuerySubmit = useCallback(
    (filter: any) => {
      setAlertParams('filterQuery', filter);
    },
    [setAlertParams]
  );

  const onGroupByChange = useCallback(
    (group: string | null) => {
      setAlertParams('groupBy', group || '');
    },
    [setAlertParams]
  );

  const emptyError = useMemo(() => {
    return {
      aggField: [],
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      const criteria =
        alertParams.criteria?.map(c => ({
          ...c,
          timeSize: ts,
        })) || [];
      setTimeSize(ts || undefined);
      setAlertParams('criteria', criteria);
    },
    [alertParams.criteria, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria =
        alertParams.criteria?.map(c => ({
          ...c,
          timeUnit: tu,
        })) || [];
      setTimeUnit(tu as TimeUnit);
      setAlertParams('criteria', criteria);
    },
    [alertParams.criteria, setAlertParams]
  );

  useEffect(() => {
    const md = alertsContext.metadata;
    if (md) {
      if (md.currentOptions?.metrics) {
        setAlertParams(
          'criteria',
          md.currentOptions.metrics.map(metric => ({
            metric: metric.field,
            comparator: Comparator.GT,
            threshold: [],
            timeSize,
            timeUnit,
            aggType: metric.aggregation,
          }))
        );
      } else {
        setAlertParams('criteria', [defaultExpression]);
      }

      if (md.currentOptions) {
        if (md.currentOptions.filterQuery) {
          setAlertParams('filterQuery', md.currentOptions.filterQuery);
        } else if (md.currentOptions.groupBy && md.series) {
          const filter = `${md.currentOptions.groupBy}: "${md.series.id}"`;
          setAlertParams('filterQuery', filter);
        }

        setAlertParams('groupBy', md.currentOptions.groupBy);
      }
      setAlertParams('sourceId', source?.id);
    } else {
      if (!alertParams.criteria) {
        setAlertParams('criteria', [defaultExpression]);
      }
      if (!alertParams.sourceId) {
        setAlertParams('sourceId', source?.id || 'default');
      }
    }
  }, [alertsContext.metadata, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterQuerySubmit(e.target.value),
    [onFilterQuerySubmit]
  );

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <EuiSpacer size={'xs'} />
      {alertParams.criteria &&
        alertParams.criteria.map((e, idx) => {
          return (
            <ExpressionRow
              canDelete={(alertParams.criteria && alertParams.criteria.length > 1) || false}
              fields={derivedIndexPattern.fields}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setAlertParams={updateParams}
              errors={errors[idx] || emptyError}
              expression={e || {}}
            >
              <ExpressionChart
                loading={chartData.loading}
                data={chartData.data}
                id={idx}
                expression={e}
              />
            </ExpressionRow>
          );
        })}

      <div style={{ marginLeft: 28 }}>
        <ForLastExpression
          timeWindowSize={timeSize}
          timeWindowUnit={timeUnit}
          errors={emptyError}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
        />
      </div>

      <div>
        <EuiButtonEmpty
          color={'primary'}
          iconSide={'left'}
          flush={'left'}
          iconType={'plusInCircleFilled'}
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>

      <EuiSpacer size={'m'} />

      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.filterLabel', {
          defaultMessage: 'Filter (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        compressed
      >
        {(alertsContext.metadata && (
          <MetricsExplorerKueryBar
            derivedIndexPattern={derivedIndexPattern}
            onSubmit={onFilterQuerySubmit}
            value={alertParams.filterQuery}
          />
        )) || (
          <EuiFieldSearch
            onChange={handleFieldSearchChange}
            value={alertParams.filterQuery}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size={'m'} />
      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerText', {
          defaultMessage: 'Create alert per (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerHelpText', {
          defaultMessage:
            'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
        })}
        fullWidth
        compressed
        labelAppend={
          alertParams.groupBy && chartData.data?.pageInfo.total != null ? (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.infra.metrics.alertFlyout.matchesLabel"
                defaultMessage="Matches {total}"
                values={{ total: chartData.data.pageInfo.total }}
              />
            </EuiText>
          ) : (
            ''
          )
        }
      >
        <MetricsExplorerGroupBy
          onChange={onGroupByChange}
          fields={derivedIndexPattern.fields}
          options={{
            ...options,
            groupBy: alertParams.groupBy || undefined,
          }}
        />
      </EuiFormRow>
    </>
  );
};

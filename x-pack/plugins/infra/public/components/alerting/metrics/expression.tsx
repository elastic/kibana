/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonIcon } from '@elastic/eui';
import { IFieldType, IIndexPattern } from 'src/plugins/data/public';
import {
  WhenExpression,
  OfExpression,
  ThresholdExpression,
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AGGREGATION_TYPES } from '../../../../../triggers_actions_ui/public/common/constants';
import { MetricsExplorerOptions } from '../../../containers/metrics_explorer/use_metrics_explorer_options';
import { SourceConfiguration } from '../../../utils/source_configuration';

interface MetricExpressionParams {
  aggType?: string;
  metric?: string;
  comparator?: Comparator;
  threshold?: number[];
  timeSize?: number;
  timeUnit?: TimeUnit;
  indexPattern?: string;
}

interface AlertContextMeta {
  currentOptions: MetricsExplorerOptions;
  derivedIndexPattern: IIndexPattern;
  source: SourceConfiguration;
}

interface Props {
  errors: IErrorObject;
  alertParams: { criteria: MetricExpressionParams[] };
  alertsContext: AlertsContextValue<AlertContextMeta>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

type Comparator = '>' | '>=' | 'between' | '<' | '<=';
type TimeUnit = 's' | 'm' | 'h' | 'd';

export const MetricExpression: React.FC<Props> = props => {
  const { setAlertParams, alertParams, errors, alertsContext } = props;

  const defaultExpression = useMemo<MetricExpressionParams>(
    () => ({
      aggType: AGGREGATION_TYPES.MAX,
      comparator: '>',
      threshold: [],
      timeSize: 1,
      timeUnit: 's',
      indexPattern: alertsContext.metadata?.source.metricAlias,
    }),
    [alertsContext.metadata]
  );

  const expressions = useMemo<MetricExpressionParams[]>(() => {
    if (alertParams.criteria) {
      return alertParams.criteria;
    } else if (alertsContext.metadata?.currentOptions) {
      return alertsContext.metadata.currentOptions.metrics.map(metric => ({
        metric: metric.field,
        comparator: '>',
        threshold: [],
        timeSize: 1,
        timeUnit: 's',
        indexPattern: alertsContext.metadata?.source.metricAlias,
        aggType: metric.aggregation,
      }));
    } else {
      return [defaultExpression];
    }
  }, [alertParams.criteria, alertsContext.metadata, defaultExpression]);

  const updateParams = useCallback(
    (id, e: MetricExpressionParams) => {
      const exp = alertParams.criteria ? alertParams.criteria.slice() : [];
      exp[id] = { ...exp[id], ...e };
      setAlertParams('criteria', exp);
    },
    [setAlertParams, alertParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = expressions.slice();
    exp.push(defaultExpression);
    setAlertParams('criteria', exp);
  }, [setAlertParams, expressions, defaultExpression]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = expressions.slice();
      exp.splice(id, 1);
      setAlertParams('criteria', exp);
    },
    [setAlertParams, expressions]
  );

  return (
    <>
      {expressions.map((e, idx) => {
        return (
          <ExpressionRow
            fields={(alertsContext.metadata!.derivedIndexPattern as IIndexPattern).fields}
            remove={removeExpression}
            addExpression={addExpression}
            key={idx} // idx's don't usually make good key's but here the index has semantic meaning
            expressionId={idx}
            setAlertParams={updateParams}
            errors={errors}
            expression={e || {}}
          />
        );
      })}
    </>
  );
};

interface ExpressionRowProps {
  fields: IFieldType[];
  expressionId: number;
  expression: MetricExpressionParams;
  errors: any;
  addExpression(): void;
  remove(id: number): void;
  setAlertParams(id: number, params: MetricExpressionParams): void;
}
export const ExpressionRow: React.FC<ExpressionRowProps> = props => {
  const { setAlertParams, expression, errors, expressionId, remove, fields } = props;
  const {
    aggType = AGGREGATION_TYPES.MAX,
    metric,
    comparator = '>',
    threshold = [],
    timeSize,
    timeUnit = 's',
  } = expression;

  const updateAggType = useCallback(
    (at: string) => {
      setAlertParams(expressionId, { ...expression, aggType: at });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateMetric = useCallback(
    (m?: string) => {
      setAlertParams(expressionId, { ...expression, metric: m });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateComparator = useCallback(
    (c?: string) => {
      setAlertParams(expressionId, { ...expression, comparator: c as Comparator });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateThreshold = useCallback(
    t => {
      setAlertParams(expressionId, { ...expression, threshold: t });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateTimeSize = useCallback(
    (ts: number | '') => {
      setAlertParams(expressionId, { ...expression, timeSize: ts || undefined });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      setAlertParams(expressionId, { ...expression, timeUnit: tu as TimeUnit });
    },
    [expressionId, expression, setAlertParams]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <WhenExpression
                customAggTypesOptions={aggregationType}
                aggType={aggType}
                onChangeSelectedAggType={updateAggType}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <OfExpression
                aggField={metric}
                fields={fields.map(f => ({
                  normalizedType: f.type,
                  name: f.name,
                }))}
                aggType={aggType}
                errors={errors}
                onChangeSelectedAggField={updateMetric}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <ThresholdExpression
                thresholdComparator={comparator || '>'}
                threshold={threshold}
                onChangeSelectedThresholdComparator={updateComparator}
                onChangeSelectedThreshold={updateThreshold}
                errors={errors}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <ForLastExpression
                timeWindowSize={timeSize}
                timeWindowUnit={timeUnit}
                errors={{ timeWindowSize: [] }}
                onChangeWindowSize={updateTimeSize}
                onChangeWindowUnit={updateTimeUnit}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color={'primary'}
                iconType={'plusInCircleFilled'}
                onClick={props.addExpression}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color={'danger'}
                iconType={'trash'}
                onClick={() => remove(expressionId)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const aggregationType: { [key: string]: any } = {
  count: {
    text: 'count',
    fieldRequired: false,
    value: AGGREGATION_TYPES.COUNT,
    validNormalizedTypes: [],
  },
  avg: {
    text: 'average',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.AVERAGE,
  },
  sum: {
    text: 'sum',
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.SUM,
  },
  min: {
    text: 'min',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MIN,
  },
  max: {
    text: 'max',
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MAX,
  },
};

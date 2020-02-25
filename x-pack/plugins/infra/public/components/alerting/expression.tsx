/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import {
  WhenExpression,
  OfExpression,
  ThresholdExpression,
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../triggers_actions_ui/public/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../triggers_actions_ui/public/application/context/alerts_context';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AGGREGATION_TYPES } from '../../../../triggers_actions_ui/public/common/constants';

interface MetricExpressionParams {
  aggType?: string;
  metric?: string;
  comparator?: Comparator;
  threshold?: number[];
  timeSize?: number;
  timeUnit?: TimeUnit;
}

interface Props {
  errors: IErrorObject;
  alertParams: { expressions: MetricExpressionParams[] };
  alertContext: AlertsContextValue;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

type Comparator = '>' | '>=' | 'between' | '<' | '<=';
type TimeUnit = 's' | 'm' | 'h' | 'd';

export const MetricExpression: React.FC<Props> = props => {
  const { setAlertParams, alertParams, errors } = props;

  const expressions = useMemo<MetricExpressionParams[]>(() => {
    return alertParams.expressions || [{}];
  }, [alertParams.expressions]);

  const updateParams = useCallback(
    (id, e: MetricExpressionParams) => {
      const exp = alertParams.expressions ? alertParams.expressions.slice() : [];
      exp[id] = { ...exp[id], ...e };
      setAlertParams('expressions', exp);
    },
    [setAlertParams, alertParams.expressions]
  );

  const addExpression = useCallback(() => {
    const exp = alertParams.expressions ? alertParams.expressions.slice() : [];
    exp.push({});
    setAlertParams('expressions', exp);
  }, [setAlertParams, alertParams.expressions]);

  return (
    <>
      <EuiButton onClick={addExpression}>Add Expression</EuiButton>
      {expressions.map((e, idx) => {
        return (
          <ExpressionRow
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
  expressionId: number;
  expression: MetricExpressionParams;
  errors: any;
  setAlertParams(id: number, params: MetricExpressionParams): void;
}
export const ExpressionRow: React.FC<ExpressionRowProps> = props => {
  const { setAlertParams, expression, errors, expressionId } = props;
  const {
    aggType = 'count',
    metric,
    comparator = '>',
    threshold = [],
    timeSize,
    timeUnit = 's',
  } = expression;

  const updateAggType = useCallback(
    (at: string) => {
      setAlertParams(expressionId, { aggType: at });
    },
    [expressionId, setAlertParams]
  );

  const updateMetric = useCallback(
    (m?: string) => {
      setAlertParams(expressionId, { metric: m });
    },
    [expressionId, setAlertParams]
  );

  const updateComparator = useCallback(
    (c?: string) => {
      setAlertParams(expressionId, { comparator: c as Comparator });
    },
    [expressionId, setAlertParams]
  );

  const updateThreshold = useCallback(
    t => {
      setAlertParams(expressionId, { threshold: t });
    },
    [expressionId, setAlertParams]
  );

  const updateTimeSize = useCallback(
    (ts: number | '') => {
      setAlertParams(expressionId, { timeSize: ts || undefined });
    },
    [expressionId, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      setAlertParams(expressionId, { timeUnit: tu as TimeUnit });
    },
    [expressionId, setAlertParams]
  );

  return (
    <>
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
            fields={[{ normalizedType: 'number', name: 'system.cpu.user.pct' }]} // can be some data from server API
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

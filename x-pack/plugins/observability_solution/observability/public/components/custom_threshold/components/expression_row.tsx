/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState, ReactElement } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  AggregationType,
  builtInComparators,
  COMPARATORS,
  IErrorObject,
  ThresholdExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { debounce } from 'lodash';
import { Aggregators, Comparator } from '../../../../common/custom_threshold_rule/types';
import { MetricExpression } from '../types';
import { CustomEquationEditor } from './custom_equation';
import { CUSTOM_EQUATION, LABEL_HELP_MESSAGE, LABEL_LABEL } from '../i18n_strings';
import { decimalToPct, pctToDecimal } from '../helpers/corrected_percent_convert';

// Create a new object with COMPARATORS.NOT_BETWEEN removed as we use OUTSIDE_RANGE
const updatedBuiltInComparators = { ...builtInComparators };
delete updatedBuiltInComparators[COMPARATORS.NOT_BETWEEN];

const customComparators = {
  ...updatedBuiltInComparators,
  [Comparator.OUTSIDE_RANGE]: {
    text: i18n.translate('xpack.observability.customThreshold.rule.alertFlyout.outsideRangeLabel', {
      defaultMessage: 'Is not between',
    }),
    value: Comparator.OUTSIDE_RANGE,
    requiredValues: 2,
  },
};

interface ExpressionRowProps {
  title: ReactElement;
  fields: DataViewFieldBase[];
  expressionId: number;
  expression: MetricExpression;
  errors: IErrorObject;
  canDelete: boolean;
  addExpression(): void;
  remove(id: number): void;
  setRuleParams(id: number, params: MetricExpression): void;
  dataView: DataViewBase;
}

const StyledExpressionRow = euiStyled(EuiFlexGroup)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0 -4px;
`;

// eslint-disable-next-line react/function-component-definition
export const ExpressionRow: React.FC<ExpressionRowProps> = (props) => {
  const {
    dataView,
    children,
    setRuleParams,
    expression,
    errors,
    expressionId,
    remove,
    fields,
    canDelete,
    title,
  } = props;

  const { metrics, comparator = Comparator.GT, threshold = [] } = expression;

  const isMetricPct = useMemo(
    () => Boolean(metrics.length === 1 && metrics[0].field?.endsWith('.pct')),
    [metrics]
  );
  const [label, setLabel] = useState<string | undefined>(expression?.label || undefined);

  const updateComparator = useCallback(
    (c?: string) => {
      setRuleParams(expressionId, { ...expression, comparator: c as Comparator });
    },
    [expressionId, expression, setRuleParams]
  );

  const convertThreshold = useCallback(
    (enteredThreshold) =>
      isMetricPct ? enteredThreshold.map((v: number) => pctToDecimal(v)) : enteredThreshold,
    [isMetricPct]
  );

  const updateThreshold = useCallback(
    (enteredThreshold) => {
      const t = convertThreshold(enteredThreshold);
      if (t.join() !== expression.threshold.join()) {
        setRuleParams(expressionId, { ...expression, threshold: t });
      }
    },
    [expressionId, expression, convertThreshold, setRuleParams]
  );

  const handleCustomMetricChange = useCallback(
    (exp) => {
      setRuleParams(expressionId, exp);
    },
    [expressionId, setRuleParams]
  );
  const debouncedLabelChange = useMemo(
    () => debounce(handleCustomMetricChange, 300),
    [handleCustomMetricChange]
  );

  const criticalThresholdExpression = (
    <ThresholdElement
      comparator={comparator}
      threshold={threshold}
      updateComparator={updateComparator}
      updateThreshold={updateThreshold}
      errors={(errors.critical as IErrorObject) ?? {}}
      isMetricPct={isMetricPct}
    />
  );

  const normalizedFields = fields.map((f) => ({
    normalizedType: f.type,
    name: f.name,
  }));

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(e.target.value);
      debouncedLabelChange({ ...expression, label: e.target.value });
    },
    [debouncedLabelChange, expression]
  );
  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h5>{title}</h5>
          </EuiTitle>
        </EuiFlexItem>
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="o11yExpressionRowButton"
              aria-label={i18n.translate(
                'xpack.observability.customThreshold.rule.alertFlyout.removeCondition',
                {
                  defaultMessage: 'Remove condition',
                }
              )}
              color={'text'}
              iconType={'trash'}
              onClick={() => remove(expressionId)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow>
          <StyledExpressionRow style={{ gap: 24 }} />
          <>
            <EuiSpacer size={'xs'} />
            <CustomEquationEditor
              expression={expression}
              fields={normalizedFields}
              aggregationTypes={aggregationType}
              onChange={handleCustomMetricChange}
              errors={errors}
              dataView={dataView}
            />
            {criticalThresholdExpression}
            <EuiSpacer size={'s'} />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow label={LABEL_LABEL} fullWidth helpText={LABEL_HELP_MESSAGE}>
                  <EuiFieldText
                    data-test-subj="thresholdRuleCustomEquationEditorFieldText"
                    compressed
                    fullWidth
                    value={label}
                    placeholder={CUSTOM_EQUATION}
                    onChange={handleLabelChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
      {children}
    </>
  );
};

const ThresholdElement: React.FC<{
  updateComparator: (c?: string) => void;
  updateThreshold: (t?: number[]) => void;
  threshold: MetricExpression['threshold'];
  isMetricPct: boolean;
  comparator: MetricExpression['comparator'];
  errors: IErrorObject;
  // eslint-disable-next-line react/function-component-definition
}> = ({ updateComparator, updateThreshold, threshold, isMetricPct, comparator, errors }) => {
  const displayedThreshold = useMemo(() => {
    if (isMetricPct) return threshold.map((v) => decimalToPct(v));
    return threshold;
  }, [threshold, isMetricPct]);

  return (
    <>
      <ThresholdExpression
        thresholdComparator={comparator || Comparator.GT}
        threshold={displayedThreshold}
        customComparators={customComparators}
        onChangeSelectedThresholdComparator={updateComparator}
        onChangeSelectedThreshold={updateThreshold}
        errors={errors}
        display="fullWidth"
        unit={isMetricPct ? '%' : ''}
      />
    </>
  );
};

export const aggregationType: { [key: string]: AggregationType } = {
  avg: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.avg',
      {
        defaultMessage: 'Average',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'histogram'],
    value: Aggregators.AVERAGE,
  },
  max: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.max',
      {
        defaultMessage: 'Max',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date', 'histogram'],
    value: Aggregators.MAX,
  },
  min: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.min',
      {
        defaultMessage: 'Min',
      }
    ),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date', 'histogram'],
    value: Aggregators.MIN,
  },
  cardinality: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.cardinality',
      {
        defaultMessage: 'Cardinality',
      }
    ),
    fieldRequired: false,
    value: Aggregators.CARDINALITY,
    validNormalizedTypes: ['number', 'string', 'ip', 'date'],
  },
  count: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.count',
      {
        defaultMessage: 'Count',
      }
    ),
    fieldRequired: false,
    value: Aggregators.COUNT,
    validNormalizedTypes: ['number'],
  },
  sum: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.sum',
      {
        defaultMessage: 'Sum',
      }
    ),
    fieldRequired: false,
    value: Aggregators.SUM,
    validNormalizedTypes: ['number', 'histogram'],
  },
  p95: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.p95',
      { defaultMessage: '95th Percentile' }
    ),
    fieldRequired: false,
    value: Aggregators.P95,
    validNormalizedTypes: ['number', 'histogram'],
  },
  p99: {
    text: i18n.translate(
      'xpack.observability.customThreshold.rule.alertFlyout.aggregationText.p99',
      { defaultMessage: '99th Percentile' }
    ),
    fieldRequired: false,
    value: Aggregators.P99,
    validNormalizedTypes: ['number', 'histogram'],
  },
  rate: {
    text: i18n.translate(
      'xpack.observability..customThreshold.rule.alertFlyout.aggregationText.rate',
      { defaultMessage: 'Rate' }
    ),
    fieldRequired: false,
    value: Aggregators.RATE,
    validNormalizedTypes: ['number'],
  },
};

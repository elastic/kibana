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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  AggregationType,
  builtInComparators,
  IErrorObject,
  ThresholdExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewBase } from '@kbn/es-query';
import { debounce } from 'lodash';
import { Comparator } from '../../../../common/threshold_rule/types';
import { AGGREGATION_TYPES, DerivedIndexPattern, MetricExpression } from '../types';
import { CustomEquationEditor } from './custom_equation';
import { CUSTOM_EQUATION, LABEL_HELP_MESSAGE, LABEL_LABEL } from '../i18n_strings';
import { decimalToPct, pctToDecimal } from '../helpers/corrected_percent_convert';

const customComparators = {
  ...builtInComparators,
  [Comparator.OUTSIDE_RANGE]: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.outsideRangeLabel', {
      defaultMessage: 'Is not between',
    }),
    value: Comparator.OUTSIDE_RANGE,
    requiredValues: 2,
  },
};

interface ExpressionRowProps {
  fields: DerivedIndexPattern['fields'];
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
  } = props;

  const { metric, comparator = Comparator.GT, threshold = [] } = expression;

  const isMetricPct = useMemo(() => Boolean(metric && metric.endsWith('.pct')), [metric]);
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
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="o11yExpressionRowButton"
              aria-label={i18n.translate(
                'xpack.observability.threshold.rule.alertFlyout.removeCondition',
                {
                  defaultMessage: 'Remove condition',
                }
              )}
              color={'danger'}
              iconType={'trash'}
              onClick={() => remove(expressionId)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {children}
      <EuiSpacer size={'s'} />
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
      />

      {isMetricPct && (
        <div
          style={{
            alignSelf: 'center',
          }}
        >
          <EuiText size={'s'}>%</EuiText>
        </div>
      )}
    </>
  );
};

export const aggregationType: { [key: string]: AggregationType } = {
  avg: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.avg', {
      defaultMessage: 'Average',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'histogram'],
    value: AGGREGATION_TYPES.AVERAGE,
  },
  max: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.max', {
      defaultMessage: 'Max',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date', 'histogram'],
    value: AGGREGATION_TYPES.MAX,
  },
  min: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.min', {
      defaultMessage: 'Min',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date', 'histogram'],
    value: AGGREGATION_TYPES.MIN,
  },
  cardinality: {
    text: i18n.translate(
      'xpack.observability.threshold.rule.alertFlyout.aggregationText.cardinality',
      {
        defaultMessage: 'Cardinality',
      }
    ),
    fieldRequired: false,
    value: AGGREGATION_TYPES.CARDINALITY,
    validNormalizedTypes: ['number', 'string', 'ip', 'date'],
  },
  rate: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.rate', {
      defaultMessage: 'Rate',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.RATE,
    validNormalizedTypes: ['number'],
  },
  count: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.count', {
      defaultMessage: 'Document count',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.COUNT,
    validNormalizedTypes: ['number'],
  },
  sum: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.sum', {
      defaultMessage: 'Sum',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.SUM,
    validNormalizedTypes: ['number', 'histogram'],
  },
  p95: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.p95', {
      defaultMessage: '95th Percentile',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.P95,
    validNormalizedTypes: ['number', 'histogram'],
  },
  p99: {
    text: i18n.translate('xpack.observability.threshold.rule.alertFlyout.aggregationText.p99', {
      defaultMessage: '99th Percentile',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.P99,
    validNormalizedTypes: ['number', 'histogram'],
  },
  custom: {
    text: CUSTOM_EQUATION,
    fieldRequired: false,
    value: AGGREGATION_TYPES.CUSTOM,
    validNormalizedTypes: ['number', 'histogram'],
  },
};

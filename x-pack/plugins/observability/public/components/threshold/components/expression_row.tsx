/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  AggregationType,
  builtInComparators,
  IErrorObject,
  OfExpression,
  ThresholdExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewBase } from '@kbn/es-query';
import useToggle from 'react-use/lib/useToggle';
import { Aggregators, Comparator } from '../../../../common/threshold_rule/types';
import { AGGREGATION_TYPES, DerivedIndexPattern, MetricExpression } from '../types';
import { CustomEquationEditor } from './custom_equation';
import { CUSTOM_EQUATION } from '../i18n_strings';
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

const StyledExpression = euiStyled.div`
  padding: 0 4px;
`;

// eslint-disable-next-line react/function-component-definition
export const ExpressionRow: React.FC<ExpressionRowProps> = (props) => {
  const [isExpanded, toggle] = useToggle(true);

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

  const {
    aggType = AGGREGATION_TYPES.MAX,
    metric,
    comparator = Comparator.GT,
    threshold = [],
  } = expression;

  const isMetricPct = useMemo(() => Boolean(metric && metric.endsWith('.pct')), [metric]);

  const updateMetric = useCallback(
    (m?: MetricExpression['metric']) => {
      setRuleParams(expressionId, { ...expression, metric: m });
    },
    [expressionId, expression, setRuleParams]
  );

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

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={toggle}
            data-test-subj="thresholdRuleExpandRow"
            aria-label={i18n.translate(
              'xpack.observability.threshold.rule.alertFlyout.expandRowLabel',
              {
                defaultMessage: 'Expand row.',
              }
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <StyledExpressionRow style={{ gap: aggType !== 'custom' ? 24 : 12 }}>
            <StyledExpression>
              <EuiExpression
                data-test-subj="thresholdRuleCustomEquationWhen"
                description={i18n.translate(
                  'xpack.observability.thresholdRule.expressionItems.descriptionLabel',
                  {
                    defaultMessage: 'when',
                  }
                )}
                value={aggregationType.custom.text}
                display={'inline'}
              />
            </StyledExpression>
            {!['count', 'custom'].includes(aggType) && (
              <StyledExpression>
                <OfExpression
                  customAggTypesOptions={aggregationType}
                  aggField={metric}
                  fields={normalizedFields}
                  aggType={aggType}
                  errors={errors}
                  onChangeSelectedAggField={updateMetric}
                  helpText={
                    <FormattedMessage
                      id="xpack.observability.threshold.rule.alertFlyout.ofExpression.helpTextDetail"
                      defaultMessage="Can't find a metric? {documentationLink}."
                      values={{
                        documentationLink: (
                          <EuiLink
                            data-test-subj="thresholdRuleExpressionRowLearnHowToAddMoreDataLink"
                            href="https://www.elastic.co/guide/en/observability/current/configure-settings.html"
                            target="BLANK"
                          >
                            <FormattedMessage
                              id="xpack.observability.threshold.rule.alertFlyout.ofExpression.popoverLinkLabel"
                              defaultMessage="Learn how to add more data"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                  data-test-subj="thresholdRuleOfExpression"
                />
              </StyledExpression>
            )}
            {criticalThresholdExpression}
          </StyledExpressionRow>

          {aggType === Aggregators.CUSTOM && (
            <>
              <EuiSpacer size={'m'} />
              <StyledExpressionRow>
                <CustomEquationEditor
                  expression={expression}
                  fields={normalizedFields}
                  aggregationTypes={aggregationType}
                  onChange={handleCustomMetricChange}
                  errors={errors}
                  dataView={dataView}
                />
              </StyledExpressionRow>
              <EuiSpacer size={'s'} />
            </>
          )}
        </EuiFlexItem>
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
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
      {isExpanded ? <div style={{ padding: '0 0 0 28px' }}>{children}</div> : null}
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
      <StyledExpression>
        <ThresholdExpression
          thresholdComparator={comparator || Comparator.GT}
          threshold={displayedThreshold}
          customComparators={customComparators}
          onChangeSelectedThresholdComparator={updateComparator}
          onChangeSelectedThreshold={updateThreshold}
          errors={errors}
        />
      </StyledExpression>
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

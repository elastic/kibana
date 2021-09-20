/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import React, { useCallback, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiHealth,
  EuiButtonEmpty,
} from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
import { pctToDecimal, decimalToPct } from '../../../../common/utils/corrected_percent_convert';
import {
  WhenExpression,
  OfExpression,
  ThresholdExpression,
} from '../../../../../triggers_actions_ui/public';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { IErrorObject } from '../../../../../triggers_actions_ui/public';
import { MetricExpression, AGGREGATION_TYPES } from '../types';
import {
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { builtInComparators } from '../../../../../triggers_actions_ui/public';

const customComparators = {
  ...builtInComparators,
  [Comparator.OUTSIDE_RANGE]: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.outsideRangeLabel', {
      defaultMessage: 'Is not between',
    }),
    value: Comparator.OUTSIDE_RANGE,
    requiredValues: 2,
  },
};

interface ExpressionRowProps {
  fields: IFieldType[];
  expressionId: number;
  expression: MetricExpression;
  errors: IErrorObject;
  canDelete: boolean;
  addExpression(): void;
  remove(id: number): void;
  setAlertParams(id: number, params: MetricExpression): void;
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

const StyledHealth = euiStyled(EuiHealth)`
  margin-left: 4px;
`;

export const ExpressionRow: React.FC<ExpressionRowProps> = (props) => {
  const [isExpanded, setRowState] = useState(true);
  const toggleRowState = useCallback(() => setRowState(!isExpanded), [isExpanded]);
  const { children, setAlertParams, expression, errors, expressionId, remove, fields, canDelete } =
    props;
  const {
    aggType = AGGREGATION_TYPES.MAX,
    metric,
    comparator = Comparator.GT,
    threshold = [],
    warningThreshold = [],
    warningComparator,
  } = expression;
  const [displayWarningThreshold, setDisplayWarningThreshold] = useState(
    Boolean(warningThreshold?.length)
  );

  const isMetricPct = useMemo(() => Boolean(metric && metric.endsWith('.pct')), [metric]);

  const updateAggType = useCallback(
    (at: string) => {
      setAlertParams(expressionId, {
        ...expression,
        aggType: at as MetricExpression['aggType'],
        metric: at === 'count' ? undefined : expression.metric,
      });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateMetric = useCallback(
    (m?: MetricExpression['metric']) => {
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

  const updateWarningComparator = useCallback(
    (c?: string) => {
      setAlertParams(expressionId, { ...expression, warningComparator: c as Comparator });
    },
    [expressionId, expression, setAlertParams]
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
        setAlertParams(expressionId, { ...expression, threshold: t });
      }
    },
    [expressionId, expression, convertThreshold, setAlertParams]
  );

  const updateWarningThreshold = useCallback(
    (enteredThreshold) => {
      const t = convertThreshold(enteredThreshold);
      if (t.join() !== expression.warningThreshold?.join()) {
        setAlertParams(expressionId, { ...expression, warningThreshold: t });
      }
    },
    [expressionId, expression, convertThreshold, setAlertParams]
  );

  const toggleWarningThreshold = useCallback(() => {
    if (!displayWarningThreshold) {
      setDisplayWarningThreshold(true);
      setAlertParams(expressionId, {
        ...expression,
        warningComparator: comparator,
        warningThreshold: [],
      });
    } else {
      setDisplayWarningThreshold(false);
      setAlertParams(expressionId, omit(expression, 'warningComparator', 'warningThreshold'));
    }
  }, [
    displayWarningThreshold,
    setDisplayWarningThreshold,
    setAlertParams,
    comparator,
    expression,
    expressionId,
  ]);

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

  const warningThresholdExpression = displayWarningThreshold && (
    <ThresholdElement
      comparator={warningComparator || comparator}
      threshold={warningThreshold}
      updateComparator={updateWarningComparator}
      updateThreshold={updateWarningThreshold}
      errors={(errors.warning as IErrorObject) ?? {}}
      isMetricPct={isMetricPct}
    />
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={toggleRowState}
            aria-label={i18n.translate('xpack.infra.metrics.alertFlyout.expandRowLabel', {
              defaultMessage: 'Expand row.',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <StyledExpressionRow>
            <StyledExpression>
              <WhenExpression
                customAggTypesOptions={aggregationType}
                aggType={aggType}
                onChangeSelectedAggType={updateAggType}
              />
            </StyledExpression>
            {aggType !== 'count' && (
              <StyledExpression>
                <OfExpression
                  customAggTypesOptions={aggregationType}
                  aggField={metric}
                  fields={fields.map((f) => ({
                    normalizedType: f.type,
                    name: f.name,
                  }))}
                  aggType={aggType}
                  errors={errors}
                  onChangeSelectedAggField={updateMetric}
                  helpText={
                    <FormattedMessage
                      id="xpack.infra.metrics.alertFlyout.ofExpression.helpTextDetail"
                      defaultMessage="Can't find a metric? {documentationLink}."
                      values={{
                        documentationLink: (
                          <EuiLink
                            href="https://www.elastic.co/guide/en/observability/current/configure-settings.html"
                            target="BLANK"
                          >
                            <FormattedMessage
                              id="xpack.infra.metrics.alertFlyout.ofExpression.popoverLinkLabel"
                              defaultMessage="Learn how to add more data"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                  data-test-subj="ofExpression"
                />
              </StyledExpression>
            )}
            {!displayWarningThreshold && criticalThresholdExpression}
          </StyledExpressionRow>
          {displayWarningThreshold && (
            <>
              <StyledExpressionRow>
                {criticalThresholdExpression}
                <StyledHealth color="danger">
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.criticalThreshold"
                    defaultMessage="Alert"
                  />
                </StyledHealth>
              </StyledExpressionRow>
              <StyledExpressionRow>
                {warningThresholdExpression}
                <StyledHealth color="warning">
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.warningThreshold"
                    defaultMessage="Warning"
                  />
                </StyledHealth>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.infra.metrics.alertFlyout.removeWarningThreshold',
                    {
                      defaultMessage: 'Remove warningThreshold',
                    }
                  )}
                  iconSize="s"
                  color={'subdued'}
                  iconType={'crossInACircleFilled'}
                  onClick={toggleWarningThreshold}
                />
              </StyledExpressionRow>
            </>
          )}
          {!displayWarningThreshold && (
            <>
              {' '}
              <EuiSpacer size={'xs'} />
              <StyledExpressionRow>
                <EuiButtonEmpty
                  color={'primary'}
                  flush={'left'}
                  size="xs"
                  iconType={'plusInCircleFilled'}
                  onClick={toggleWarningThreshold}
                >
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.addWarningThreshold"
                    defaultMessage="Add warning threshold"
                  />
                </EuiButtonEmpty>
              </StyledExpressionRow>
            </>
          )}
        </EuiFlexItem>
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.infra.metrics.alertFlyout.removeCondition', {
                defaultMessage: 'Remove condition',
              })}
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

export const aggregationType: { [key: string]: any } = {
  avg: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.avg', {
      defaultMessage: 'Average',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGGREGATION_TYPES.AVERAGE,
  },
  max: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.max', {
      defaultMessage: 'Max',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MAX,
  },
  min: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.min', {
      defaultMessage: 'Min',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGGREGATION_TYPES.MIN,
  },
  cardinality: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.cardinality', {
      defaultMessage: 'Cardinality',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.CARDINALITY,
    validNormalizedTypes: ['number'],
  },
  rate: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.rate', {
      defaultMessage: 'Rate',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.RATE,
    validNormalizedTypes: ['number'],
  },
  count: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.count', {
      defaultMessage: 'Document count',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.COUNT,
    validNormalizedTypes: ['number'],
  },
  sum: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.sum', {
      defaultMessage: 'Sum',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.SUM,
    validNormalizedTypes: ['number'],
  },
  p95: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.p95', {
      defaultMessage: '95th Percentile',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.P95,
    validNormalizedTypes: ['number'],
  },
  p99: {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.aggregationText.p99', {
      defaultMessage: '99th Percentile',
    }),
    fieldRequired: false,
    value: AGGREGATION_TYPES.P99,
    validNormalizedTypes: ['number'],
  },
};

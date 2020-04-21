/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiButtonEmpty,
} from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  MetricExpressionParams,
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { euiStyled } from '../../../../../observability/public';
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
import { MetricsExplorerSeries } from '../../../../common/http_api/metrics_explorer';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricsExplorerGroupBy } from '../../../pages/metrics/metrics_explorer/components/group_by';
import { useSourceViaHttp } from '../../../containers/source/use_source_via_http';

interface AlertContextMeta {
  currentOptions?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
}

interface Props {
  errors: IErrorObject[];
  alertParams: {
    criteria: MetricExpression[];
    groupBy?: string;
    filterQuery?: string;
    sourceId?: string;
  };
  alertsContext: AlertsContextValue<AlertContextMeta>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

type TimeUnit = 's' | 'm' | 'h' | 'd';
type MetricExpression = Omit<MetricExpressionParams, 'metric'> & {
  metric?: string;
};

enum AGGREGATION_TYPES {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  RATE = 'rate',
  CARDINALITY = 'cardinality',
}

const defaultExpression = {
  aggType: AGGREGATION_TYPES.AVERAGE,
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
    const exp = alertParams.criteria.slice();
    exp.push(defaultExpression);
    setAlertParams('criteria', exp);
  }, [setAlertParams, alertParams.criteria]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = alertParams.criteria.slice();
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
      setAlertParams('groupBy', group || undefined);
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
      const criteria = alertParams.criteria.map(c => ({
        ...c,
        timeSize: ts,
      }));
      setTimeSize(ts || undefined);
      setAlertParams('criteria', criteria);
    },
    [alertParams.criteria, setAlertParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria = alertParams.criteria.map(c => ({
        ...c,
        timeUnit: tu,
      }));
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
      setAlertParams('criteria', [defaultExpression]);
    }
  }, [alertsContext.metadata, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

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
              canDelete={alertParams.criteria.length > 1}
              fields={derivedIndexPattern.fields}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setAlertParams={updateParams}
              errors={errors[idx] || emptyError}
              expression={e || {}}
            />
          );
        })}

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        errors={emptyError}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
      />

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

      {alertsContext.metadata && (
        <>
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
            <MetricsExplorerKueryBar
              derivedIndexPattern={derivedIndexPattern}
              onSubmit={onFilterQuerySubmit}
              value={alertParams.filterQuery}
            />
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
      )}
    </>
  );
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
  margin: 0 -4px;
`;

const StyledExpression = euiStyled.div`
  padding: 0 4px;
`;

export const ExpressionRow: React.FC<ExpressionRowProps> = props => {
  const { setAlertParams, expression, errors, expressionId, remove, fields, canDelete } = props;
  const {
    aggType = AGGREGATION_TYPES.MAX,
    metric,
    comparator = Comparator.GT,
    threshold = [],
  } = expression;

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

  const updateThreshold = useCallback(
    t => {
      if (t.join() !== expression.threshold.join()) {
        setAlertParams(expressionId, { ...expression, threshold: t });
      }
    },
    [expressionId, expression, setAlertParams]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
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
                  fields={fields.map(f => ({
                    normalizedType: f.type,
                    name: f.name,
                  }))}
                  aggType={aggType}
                  errors={errors}
                  onChangeSelectedAggField={updateMetric}
                />
              </StyledExpression>
            )}
            <StyledExpression>
              <ThresholdExpression
                thresholdComparator={comparator || Comparator.GT}
                threshold={threshold}
                onChangeSelectedThresholdComparator={updateComparator}
                onChangeSelectedThreshold={updateThreshold}
                errors={errors}
              />
            </StyledExpression>
          </StyledExpressionRow>
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
      <EuiSpacer size={'s'} />
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
};

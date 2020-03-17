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
import { AGGREGATION_TYPES } from '../../../../../triggers_actions_ui/public/common/constants';
import { MetricsExplorerOptions } from '../../../containers/metrics_explorer/use_metrics_explorer_options';
import { MetricsExplorerKueryBar } from '../../metrics_explorer/kuery_bar';
import { MetricsExplorerSeries } from '../../../../common/http_api/metrics_explorer';
import { useSource } from '../../../containers/source';
import { MetricsExplorerGroupBy } from '../../metrics_explorer/group_by';

export interface MetricExpression {
  aggType?: string;
  metric?: string;
  comparator?: Comparator;
  threshold?: number[];
  timeSize?: number;
  timeUnit?: TimeUnit;
  indexPattern?: string;
}

interface AlertContextMeta {
  currentOptions?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
}

interface Props {
  errors: IErrorObject[];
  alertParams: {
    criteria: MetricExpression[];
    groupBy?: string | null;
    filterQuery?: string;
  };
  alertsContext: AlertsContextValue<AlertContextMeta>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

type Comparator = '>' | '>=' | 'between' | '<' | '<=';
type TimeUnit = 's' | 'm' | 'h' | 'd';

export const Expressions: React.FC<Props> = props => {
  const { setAlertParams, alertParams, errors, alertsContext } = props;
  const { source, createDerivedIndexPattern } = useSource({ sourceId: 'default' });
  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('s');

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

  const defaultExpression = useMemo<MetricExpression>(
    () => ({
      aggType: AGGREGATION_TYPES.MAX,
      comparator: '>',
      threshold: [],
      timeSize: 1,
      timeUnit: 's',
      indexPattern: source?.configuration.metricAlias,
    }),
    [source]
  );

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
  }, [setAlertParams, alertParams.criteria, defaultExpression]);

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
      setAlertParams('groupBy', group);
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
    (ts: number | '') => {
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
            comparator: '>',
            threshold: [],
            timeSize,
            timeUnit,
            indexPattern: source?.configuration.metricAlias,
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
            id={'xpack.infra.metrics.alertFlyout.addCondition'}
            defaultMessage={'Add condition'}
          />
        </EuiButtonEmpty>
      </div>

      <EuiSpacer size={'m'} />

      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.filterLabel', {
          defaultMessage: 'Filter',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.filterHelpText', {
          defaultMessage: 'Filter help text',
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

      {alertsContext.metadata && (
        <EuiFormRow
          label={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerText', {
            defaultMessage: 'Create alert per',
          })}
          helpText={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerHelpText', {
            defaultMessage: 'Create alert help text',
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
  margin: 0 -${props => props.theme.eui.euiSizeXS};
`;

const StyledExpression = euiStyled.div`
  padding: 0 ${props => props.theme.eui.euiSizeXS};
`;

export const ExpressionRow: React.FC<ExpressionRowProps> = props => {
  const { setAlertParams, expression, errors, expressionId, remove, fields, canDelete } = props;
  const { aggType = AGGREGATION_TYPES.MAX, metric, comparator = '>', threshold = [] } = expression;

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
            <StyledExpression>
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
            </StyledExpression>
            <StyledExpression>
              <ThresholdExpression
                thresholdComparator={comparator || '>'}
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

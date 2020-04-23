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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { euiStyled } from '../../../../../observability/public';
import {
  WhenExpression,
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
import { useSourceViaHttp } from '../../../containers/source/use_source_via_http';
import { toMetricOpt } from '../../../pages/metrics/inventory_view/components/toolbars/toolbar_wrapper';
import { sqsMetricTypes } from '../../../../common/inventory_models/aws_sqs/toolbar_items';
import { ec2MetricTypes } from '../../../../common/inventory_models/aws_ec2/toolbar_items';
import { s3MetricTypes } from '../../../../common/inventory_models/aws_s3/toolbar_items';
import { rdsMetricTypes } from '../../../../common/inventory_models/aws_rds/toolbar_items';
import { hostMetricTypes } from '../../../../common/inventory_models/host/toolbar_items';
import { containerMetricTypes } from '../../../../common/inventory_models/container/toolbar_items';
import { podMetricTypes } from '../../../../common/inventory_models/pod/toolbar_items';
import { findInventoryModel } from '../../../../common/inventory_models';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { InventoryMetricConditions } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import { SnapshotMetricInput } from '../../../../common/http_api/snapshot_api';
import { MetricExpression } from './metric';

interface AlertContextMeta {
  currentOptions?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
}

interface Props {
  errors: IErrorObject[];
  alertParams: {
    criteria: InventoryMetricConditions[];
    groupBy?: string;
    filterQuery?: string;
    sourceId?: string;
  };
  alertsContext: AlertsContextValue<AlertContextMeta>;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
}

type TimeUnit = 's' | 'm' | 'h' | 'd';

const defaultExpression = {
  metric: 'cpu' as SnapshotMetricType,
  comparator: Comparator.GT,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as InventoryMetricConditions;

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
  const [nodeType, setNodeType] = useState<InventoryItemType>('host');

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
    (id, e: InventoryMetricConditions) => {
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

  const updateNodeType = useCallback(
    (nt: any) => {
      setNodeType(nt);
      setAlertParams('nodeType', nt);
    },
    [setAlertParams]
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
      <StyledExpression>
        <WhenExpression
          customAggTypesOptions={aggregationType}
          aggType={nodeType}
          onChangeSelectedAggType={updateNodeType}
        />
      </StyledExpression>
      <EuiSpacer size={'xs'} />
      {alertParams.criteria &&
        alertParams.criteria.map((e, idx) => {
          return (
            <ExpressionRow
              nodeType={nodeType}
              canDelete={alertParams.criteria.length > 1}
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
        </>
      )}
    </>
  );
};

interface ExpressionRowProps {
  nodeType: InventoryItemType;
  expressionId: number;
  expression: Omit<InventoryMetricConditions, 'metric'> & {
    metric?: SnapshotMetricType;
  };
  errors: IErrorObject;
  canDelete: boolean;
  addExpression(): void;
  remove(id: number): void;
  setAlertParams(id: number, params: Partial<InventoryMetricConditions>): void;
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
  const { setAlertParams, expression, errors, expressionId, remove, canDelete } = props;
  const { metric, comparator = Comparator.GT, threshold = [] } = expression;

  const updateMetric = useCallback(
    (m?: SnapshotMetricType) => {
      setAlertParams(expressionId, { ...expression, metric: m });
    },
    [expressionId, expression, setAlertParams]
  );

  const updateComparator = useCallback(
    (c?: string) => {
      setAlertParams(expressionId, { ...expression, comparator: c as Comparator | undefined });
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

  const ofFields = useMemo(() => {
    let myMetrics = hostMetricTypes;

    switch (props.nodeType) {
      case 'awsEC2':
        myMetrics = ec2MetricTypes;
        break;
      case 'awsRDS':
        myMetrics = rdsMetricTypes;
        break;
      case 'awsS3':
        myMetrics = s3MetricTypes;
        break;
      case 'awsSQS':
        myMetrics = sqsMetricTypes;
        break;
      case 'host':
        myMetrics = hostMetricTypes;
        break;
      case 'pod':
        myMetrics = podMetricTypes;
        break;
      case 'container':
        myMetrics = containerMetricTypes;
        break;
    }
    return myMetrics.map(toMetricOpt);
  }, [props.nodeType]);

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow>
          <StyledExpressionRow>
            <StyledExpression>
              <MetricExpression
                metric={{
                  value: metric!,
                  text: ofFields.find(v => v?.value === metric)?.text || '',
                }}
                metrics={
                  ofFields.filter(m => m !== undefined && m.value !== undefined) as Array<{
                    value: SnapshotMetricType;
                    text: string;
                  }>
                }
                onChange={updateMetric}
                errors={errors}
              />
            </StyledExpression>
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

const getDisplayNameForType = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  return inventoryModel.displayName;
};

export const aggregationType: { [key: string]: any } = {
  host: {
    text: getDisplayNameForType('host'),
    value: 'host',
  },
  pod: {
    text: getDisplayNameForType('pod'),
    value: 'pod',
  },
  container: {
    text: getDisplayNameForType('container'),
    value: 'container',
  },
  awsEC2: {
    text: getDisplayNameForType('awsEC2'),
    value: 'awsEC2',
  },
  awsS3: {
    text: getDisplayNameForType('awsS3'),
    value: 'awsS3',
  },
  awsRDS: {
    text: getDisplayNameForType('awsRDS'),
    value: 'awsRDS',
  },
  awsSQS: {
    text: getDisplayNameForType('awsSQS'),
    value: 'awsSQS',
  },
};

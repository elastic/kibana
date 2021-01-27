/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debounce, pick } from 'lodash';
import { Unit } from '@elastic/datemath';
import React, { useCallback, useMemo, useEffect, useState, ChangeEvent } from 'react';
import { IFieldType } from 'src/plugins/data/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiCheckbox,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { toMetricOpt } from '../../../../common/snapshot_metric_i18n';
import { AlertPreview } from '../../common';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import {
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import {
  ThresholdExpression,
  ForLastExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { useSourceViaHttp } from '../../../containers/source/use_source_via_http';
import { sqsMetricTypes } from '../../../../common/inventory_models/aws_sqs/toolbar_items';
import { ec2MetricTypes } from '../../../../common/inventory_models/aws_ec2/toolbar_items';
import { s3MetricTypes } from '../../../../common/inventory_models/aws_s3/toolbar_items';
import { rdsMetricTypes } from '../../../../common/inventory_models/aws_rds/toolbar_items';
import { hostMetricTypes } from '../../../../common/inventory_models/host/toolbar_items';
import { containerMetricTypes } from '../../../../common/inventory_models/container/toolbar_items';
import { podMetricTypes } from '../../../../common/inventory_models/pod/toolbar_items';
import { findInventoryModel } from '../../../../common/inventory_models';
import {
  InventoryItemType,
  SnapshotMetricType,
  SnapshotMetricTypeRT,
} from '../../../../common/inventory_models/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { InventoryMetricConditions } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import { MetricExpression } from './metric';
import { NodeTypeExpression } from './node_type';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import {
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../../common/http_api/snapshot_api';

import { validateMetricThreshold } from './validation';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const FILTER_TYPING_DEBOUNCE_MS = 500;

export interface AlertContextMeta {
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
  customMetrics?: SnapshotCustomMetricInput[];
}

interface Props {
  errors: IErrorObject[];
  alertParams: {
    criteria: InventoryMetricConditions[];
    nodeType: InventoryItemType;
    filterQuery?: string;
    filterQueryText?: string;
    sourceId: string;
    alertOnNoData?: boolean;
  };
  alertInterval: string;
  alertThrottle: string;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
  metadata: AlertContextMeta;
}

export const defaultExpression = {
  metric: 'cpu' as SnapshotMetricType,
  comparator: Comparator.GT,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
  customMetric: {
    type: 'custom',
    id: 'alert-custom-metric',
    field: '',
    aggregation: 'avg',
  },
} as InventoryMetricConditions;

export const Expressions: React.FC<Props> = (props) => {
  const { http, notifications } = useKibanaContextForPlugin().services;
  const { setAlertParams, alertParams, errors, alertInterval, alertThrottle, metadata } = props;
  const { source, createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    type: 'metrics',
    fetch: http.fetch,
    toastWarning: notifications.toasts.addWarning,
  });
  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<Unit>('m');

  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);

  const updateParams = useCallback(
    (id, e: InventoryMetricConditions) => {
      const exp = alertParams.criteria ? alertParams.criteria.slice() : [];
      exp[id] = { ...exp[id], ...e };
      setAlertParams('criteria', exp);
    },
    [setAlertParams, alertParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = alertParams.criteria?.slice() || [];
    exp.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setAlertParams('criteria', exp);
  }, [setAlertParams, alertParams.criteria, timeSize, timeUnit]);

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

  const onFilterChange = useCallback(
    (filter: any) => {
      setAlertParams('filterQueryText', filter || '');
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
      );
    },
    [derivedIndexPattern, setAlertParams]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

  const emptyError = useMemo(() => {
    return {
      aggField: [],
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  const updateTimeSize = useCallback(
    (ts: number | undefined) => {
      const criteria = alertParams.criteria.map((c) => ({
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
      const criteria = alertParams.criteria.map((c) => ({
        ...c,
        timeUnit: tu,
      }));
      setTimeUnit(tu as Unit);
      setAlertParams('criteria', criteria);
    },
    [alertParams.criteria, setAlertParams]
  );

  const updateNodeType = useCallback(
    (nt: any) => {
      setAlertParams('nodeType', nt);
    },
    [setAlertParams]
  );

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

  const preFillAlertCriteria = useCallback(() => {
    const md = metadata;
    if (md && md.options) {
      setAlertParams('criteria', [
        {
          ...defaultExpression,
          metric: md.options.metric!.type,
          customMetric: SnapshotCustomMetricInputRT.is(md.options.metric)
            ? md.options.metric
            : defaultExpression.customMetric,
        } as InventoryMetricConditions,
      ]);
    } else {
      setAlertParams('criteria', [defaultExpression]);
    }
  }, [metadata, setAlertParams]);

  const preFillAlertFilter = useCallback(() => {
    const md = metadata;
    if (md && md.filter) {
      setAlertParams('filterQueryText', md.filter);
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(md.filter, derivedIndexPattern) || ''
      );
    }
  }, [metadata, derivedIndexPattern, setAlertParams]);

  useEffect(() => {
    const md = metadata;
    if (!alertParams.nodeType) {
      if (md && md.nodeType) {
        setAlertParams('nodeType', md.nodeType);
      } else {
        setAlertParams('nodeType', 'host');
      }
    }

    if (alertParams.criteria && alertParams.criteria.length) {
      setTimeSize(alertParams.criteria[0].timeSize);
      setTimeUnit(alertParams.criteria[0].timeUnit);
    } else {
      preFillAlertCriteria();
    }

    if (!alertParams.filterQuery) {
      preFillAlertFilter();
    }

    if (!alertParams.sourceId) {
      setAlertParams('sourceId', source?.id || 'default');
    }
  }, [metadata, derivedIndexPattern, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <StyledExpressionRow>
          <NodeTypeExpression
            options={nodeTypes}
            value={alertParams.nodeType || 'host'}
            onChange={updateNodeType}
          />
        </StyledExpressionRow>
      </StyledExpression>
      <EuiSpacer size={'xs'} />
      {alertParams.criteria &&
        alertParams.criteria.map((e, idx) => {
          return (
            <ExpressionRow
              nodeType={alertParams.nodeType}
              canDelete={alertParams.criteria.length > 1}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setAlertParams={updateParams}
              errors={errors[idx] || emptyError}
              expression={e || {}}
              fields={derivedIndexPattern.fields}
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
      <EuiCheckbox
        id="metrics-alert-no-data-toggle"
        label={
          <>
            {i18n.translate('xpack.infra.metrics.alertFlyout.alertOnNoData', {
              defaultMessage: "Alert me if there's no data",
            })}{' '}
            <EuiToolTip
              content={i18n.translate('xpack.infra.metrics.alertFlyout.noDataHelpText', {
                defaultMessage:
                  'Enable this to trigger the action if the metric(s) do not report any data over the expected time period, or if the alert fails to query Elasticsearch',
              })}
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </>
        }
        checked={alertParams.alertOnNoData}
        onChange={(e) => setAlertParams('alertOnNoData', e.target.checked)}
      />

      <EuiSpacer size={'m'} />

      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.filterLabel', {
          defaultMessage: 'Filter (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        display="rowCompressed"
      >
        {(metadata && (
          <MetricsExplorerKueryBar
            derivedIndexPattern={derivedIndexPattern}
            onSubmit={onFilterChange}
            onChange={debouncedOnFilterChange}
            value={alertParams.filterQueryText}
          />
        )) || (
          <EuiFieldSearch
            onChange={handleFieldSearchChange}
            value={alertParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size={'m'} />
      <AlertPreview
        alertInterval={alertInterval}
        alertThrottle={alertThrottle}
        alertType={METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID}
        alertParams={pick(alertParams, 'criteria', 'nodeType', 'sourceId', 'filterQuery')}
        validate={validateMetricThreshold}
        groupByDisplayName={alertParams.nodeType}
        showNoDataResults={alertParams.alertOnNoData}
      />
      <EuiSpacer size={'m'} />
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default Expressions;

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
  fields: IFieldType[];
}

const StyledExpressionRow = euiStyled(EuiFlexGroup)`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -4px;
`;

const StyledExpression = euiStyled.div`
  padding: 0 4px;
`;

export const ExpressionRow: React.FC<ExpressionRowProps> = (props) => {
  const { setAlertParams, expression, errors, expressionId, remove, canDelete, fields } = props;
  const { metric, comparator = Comparator.GT, threshold = [], customMetric } = expression;

  const updateMetric = useCallback(
    (m?: SnapshotMetricType | string) => {
      const newMetric = SnapshotMetricTypeRT.is(m) ? m : Boolean(m) ? 'custom' : undefined;
      const newAlertParams = { ...expression, metric: newMetric };
      setAlertParams(expressionId, newAlertParams);
    },
    [expressionId, expression, setAlertParams]
  );

  const updateCustomMetric = useCallback(
    (cm?: SnapshotCustomMetricInput) => {
      if (SnapshotCustomMetricInputRT.is(cm)) {
        setAlertParams(expressionId, { ...expression, customMetric: cm });
      }
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
    (t) => {
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
                  text: ofFields.find((v) => v?.value === metric)?.text || '',
                }}
                metrics={
                  ofFields.filter((m) => m !== undefined && m.value !== undefined) as Array<{
                    value: SnapshotMetricType;
                    text: string;
                  }>
                }
                onChange={updateMetric}
                onChangeCustom={updateCustomMetric}
                errors={errors}
                customMetric={customMetric}
                fields={fields}
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
            {metric && (
              <div
                style={{
                  alignSelf: 'center',
                }}
              >
                <EuiText size={'s'}>{metricUnit[metric]?.label || ''}</EuiText>
              </div>
            )}
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

export const nodeTypes: { [key: string]: any } = {
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

const metricUnit: Record<string, { label: string }> = {
  count: { label: '' },
  cpu: { label: '%' },
  memory: { label: '%' },
  rx: { label: 'bits/s' },
  tx: { label: 'bits/s' },
  logRate: { label: '/s' },
  diskIOReadBytes: { label: 'bytes/s' },
  diskIOWriteBytes: { label: 'bytes/s' },
  s3BucketSize: { label: 'bytes' },
  s3TotalRequests: { label: '' },
  s3NumberOfObjects: { label: '' },
  s3UploadBytes: { label: 'bytes' },
  s3DownloadBytes: { label: 'bytes' },
  sqsOldestMessage: { label: 'seconds' },
  rdsLatency: { label: 'ms' },
  custom: { label: '' },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { TimeUnitChar } from '@kbn/observability-plugin/common/utils/formatters/duration';
import {
  ForLastExpression,
  IErrorObject,
  RuleTypeParamsExpressionProps,
  ThresholdExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { debounce, omit } from 'lodash';
import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  FC,
  PropsWithChildren,
} from 'react';
import useToggle from 'react-use/lib/useToggle';
import {
  findInventoryModel,
  awsEC2SnapshotMetricTypes,
  awsRDSSnapshotMetricTypes,
  awsS3SnapshotMetricTypes,
  awsSQSSnapshotMetricTypes,
  containerSnapshotMetricTypes,
  hostSnapshotMetricTypes,
  podSnapshotMetricTypes,
  InventoryItemType,
  SnapshotMetricType,
  SnapshotMetricTypeRT,
} from '@kbn/metrics-data-access-plugin/common';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { convertToBuiltInComparators } from '@kbn/observability-plugin/common';
import {
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../../common/http_api';
import {
  FilterQuery,
  InventoryMetricConditions,
  QUERY_INVALID,
} from '../../../../common/alerting/metrics';
import { toMetricOpt } from '../../../../common/snapshot_metric_i18n';
import {
  useMetricsDataViewContext,
  useSourceContext,
  withSourceProvider,
} from '../../../containers/metrics_source';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import { ExpressionChart } from './expression_chart';
import { MetricExpression } from './metric';
import { NodeTypeExpression } from './node_type';

const FILTER_TYPING_DEBOUNCE_MS = 500;

export interface AlertContextMeta {
  accountId?: string;
  region?: string;
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
  customMetrics?: SnapshotCustomMetricInput[];
}

type Criteria = InventoryMetricConditions[];
type Props = Omit<
  RuleTypeParamsExpressionProps<
    {
      criteria: Criteria;
      nodeType: InventoryItemType;
      filterQuery?: FilterQuery;
      filterQueryText?: string;
      sourceId: string;
      alertOnNoData?: boolean;
      accountId?: string;
      region?: string;
    },
    AlertContextMeta
  >,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch' | 'onChangeMetaData'
>;

export const defaultExpression = {
  metric: 'cpu' as SnapshotMetricType,
  comparator: COMPARATORS.GREATER_THAN,
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
  const { setRuleParams, ruleParams, errors, metadata } = props;
  const { source } = useSourceContext();

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnitChar>('m');

  const { metricsView } = useMetricsDataViewContext();

  const updateParams = useCallback(
    (id, e: InventoryMetricConditions) => {
      const exp = ruleParams.criteria ? ruleParams.criteria.slice() : [];
      exp[id] = e;
      setRuleParams('criteria', exp);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const addExpression = useCallback(() => {
    const exp = ruleParams.criteria?.slice() || [];
    exp.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setRuleParams('criteria', exp);
  }, [setRuleParams, ruleParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const exp = ruleParams.criteria.slice();
      if (exp.length > 1) {
        exp.splice(id, 1);
        setRuleParams('criteria', exp);
      }
    },
    [setRuleParams, ruleParams.criteria]
  );

  const onFilterChange = useCallback(
    (filter: string) => {
      setRuleParams('filterQueryText', filter ?? '');
      try {
        setRuleParams(
          'filterQuery',
          convertKueryToElasticSearchQuery(filter, metricsView?.dataViewReference, false) || ''
        );
      } catch (e) {
        setRuleParams('filterQuery', QUERY_INVALID);
      }
    },
    [metricsView?.dataViewReference, setRuleParams]
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
      const criteria = ruleParams.criteria.map((c) => ({
        ...c,
        timeSize: ts,
      }));
      setTimeSize(ts || undefined);
      setRuleParams('criteria', criteria as Criteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const criteria = ruleParams.criteria.map((c) => ({
        ...c,
        timeUnit: tu,
      }));
      setTimeUnit(tu as TimeUnitChar);
      setRuleParams('criteria', criteria as Criteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const updateNodeType = useCallback(
    (nt: any) => {
      setRuleParams('nodeType', nt);
    },
    [setRuleParams]
  );

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

  const preFillAlertCriteria = useCallback(() => {
    const md = metadata;
    if (md && md.options) {
      setRuleParams('criteria', [
        {
          ...defaultExpression,
          metric: md.options.metric!.type,
          customMetric: SnapshotCustomMetricInputRT.is(md.options.metric)
            ? md.options.metric
            : defaultExpression.customMetric,
        } as InventoryMetricConditions,
      ]);
    } else {
      setRuleParams('criteria', [defaultExpression]);
    }
  }, [metadata, setRuleParams]);

  const preFillAlertFilter = useCallback(() => {
    const md = metadata;
    if (md && md.filter) {
      setRuleParams('filterQueryText', md.filter);
      setRuleParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(md.filter, metricsView?.dataViewReference) || ''
      );
    }
  }, [metadata, metricsView?.dataViewReference, setRuleParams]);

  useEffect(() => {
    const md = metadata;
    if (!ruleParams.nodeType) {
      if (md && md.nodeType) {
        setRuleParams('nodeType', md.nodeType);
      } else {
        setRuleParams('nodeType', 'host');
      }
    }

    if (ruleParams.criteria && ruleParams.criteria.length) {
      setTimeSize(ruleParams.criteria[0].timeSize);
      setTimeUnit(ruleParams.criteria[0].timeUnit);
    } else {
      preFillAlertCriteria();
    }

    if (ruleParams.filterQuery === undefined) {
      preFillAlertFilter();
    }

    if (!ruleParams.sourceId) {
      setRuleParams('sourceId', source?.id || 'default');
    }
  }, [metadata, metricsView?.dataViewReference, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <div css={StyledExpressionCss}>
        <EuiFlexGroup css={StyledExpressionRowCss}>
          <div css={NonCollapsibleExpressionCss}>
            <NodeTypeExpression
              options={nodeTypes}
              value={ruleParams.nodeType || 'host'}
              onChange={updateNodeType}
            />
          </div>
        </EuiFlexGroup>
      </div>
      <EuiSpacer size="xs" />
      {ruleParams.criteria &&
        ruleParams.criteria.map((e, idx) => {
          return (
            <ExpressionRow
              nodeType={ruleParams.nodeType}
              canDelete={ruleParams.criteria.length > 1}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setRuleParams={updateParams}
              errors={(errors[idx] as IErrorObject) || emptyError}
              expression={e || {}}
            >
              <ExpressionChart
                expression={e}
                filterQuery={ruleParams.filterQuery}
                nodeType={ruleParams.nodeType}
                sourceId={ruleParams.sourceId}
                accountId={ruleParams.accountId}
                region={ruleParams.region}
                data-test-subj="preview-chart"
              />
            </ExpressionRow>
          );
        })}

      <div css={NonCollapsibleExpressionCss}>
        <ForLastExpression
          timeWindowSize={timeSize}
          timeWindowUnit={timeUnit}
          errors={emptyError}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
        />
      </div>

      <div>
        <EuiButtonEmpty
          data-test-subj="infraExpressionsAddConditionButton"
          color="primary"
          iconSide="left"
          flush="left"
          iconType="plusInCircleFilled"
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>

      <EuiSpacer size="m" />
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
        checked={ruleParams.alertOnNoData}
        onChange={(e) => setRuleParams('alertOnNoData', e.target.checked)}
      />

      <EuiSpacer size="m" />

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
        {metadata ? (
          <MetricsExplorerKueryBar
            onSubmit={onFilterChange}
            onChange={debouncedOnFilterChange}
            value={ruleParams.filterQueryText}
          />
        ) : (
          <EuiFieldSearch
            data-test-subj="infraExpressionsFieldSearch"
            onChange={handleFieldSearchChange}
            value={ruleParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />
    </>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default withSourceProvider<Props>(Expressions)('default');

interface ExpressionRowProps {
  nodeType: InventoryItemType;
  expressionId: number;
  expression: Omit<InventoryMetricConditions, 'metric'> & {
    metric?: SnapshotMetricType;
  };
  errors: RuleTypeParamsExpressionProps['errors'];
  canDelete: boolean;
  addExpression(): void;
  remove(id: number): void;
  setRuleParams(id: number, params: Partial<InventoryMetricConditions>): void;
}

const NonCollapsibleExpressionCss = css`
  margin-left: 28px;
`;

const StyledExpressionRowCss = css`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -4px;
`;

const StyledExpressionCss = css`
  padding: 0 4px;
`;

const StyledHealthCss = css`
  margin-left: 4px;
`;

export const ExpressionRow: FC<PropsWithChildren<ExpressionRowProps>> = (props) => {
  const [isExpanded, toggle] = useToggle(true);

  const { children, setRuleParams, expression, errors, expressionId, remove, canDelete } = props;
  const {
    metric,
    comparator = COMPARATORS.GREATER_THAN,
    threshold = [],
    customMetric,
    warningThreshold = [],
    warningComparator,
  } = expression;

  const [displayWarningThreshold, setDisplayWarningThreshold] = useState(
    Boolean(warningThreshold?.length)
  );

  const updateMetric = useCallback(
    (m?: SnapshotMetricType | string) => {
      const newMetric = SnapshotMetricTypeRT.is(m) ? m : Boolean(m) ? 'custom' : undefined;
      const newAlertParams = { ...expression, metric: newMetric };
      setRuleParams(expressionId, newAlertParams);
    },
    [expressionId, expression, setRuleParams]
  );

  const updateCustomMetric = useCallback(
    (cm?: SnapshotCustomMetricInput) => {
      if (SnapshotCustomMetricInputRT.is(cm)) {
        setRuleParams(expressionId, { ...expression, customMetric: cm });
      }
    },
    [expressionId, expression, setRuleParams]
  );

  const updateComparator = useCallback(
    (c?: string) => {
      setRuleParams(expressionId, { ...expression, comparator: c as COMPARATORS | undefined });
    },
    [expressionId, expression, setRuleParams]
  );

  const updateWarningComparator = useCallback(
    (c?: string) => {
      setRuleParams(expressionId, { ...expression, warningComparator: c as COMPARATORS });
    },
    [expressionId, expression, setRuleParams]
  );

  const updateThreshold = useCallback(
    (t) => {
      if (t.join() !== expression.threshold.join()) {
        setRuleParams(expressionId, { ...expression, threshold: t });
      }
    },
    [expressionId, expression, setRuleParams]
  );

  const updateWarningThreshold = useCallback(
    (t) => {
      if (t.join() !== expression.warningThreshold?.join()) {
        setRuleParams(expressionId, { ...expression, warningThreshold: t });
      }
    },
    [expressionId, expression, setRuleParams]
  );

  const toggleWarningThreshold = useCallback(() => {
    if (!displayWarningThreshold) {
      setDisplayWarningThreshold(true);
      setRuleParams(expressionId, {
        ...expression,
        warningComparator: comparator,
        warningThreshold: [],
      });
    } else {
      setDisplayWarningThreshold(false);
      setRuleParams(expressionId, omit(expression, 'warningComparator', 'warningThreshold'));
    }
  }, [
    displayWarningThreshold,
    setDisplayWarningThreshold,
    setRuleParams,
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
      metric={metric}
    />
  );

  const warningThresholdExpression = displayWarningThreshold && (
    <ThresholdElement
      comparator={warningComparator || comparator}
      threshold={warningThreshold}
      updateComparator={updateWarningComparator}
      updateThreshold={updateWarningThreshold}
      errors={(errors.warning as IErrorObject) ?? {}}
      metric={metric}
    />
  );

  const ofFields = useMemo(() => {
    let myMetrics: SnapshotMetricType[] = hostSnapshotMetricTypes;

    switch (props.nodeType) {
      case 'awsEC2':
        myMetrics = awsEC2SnapshotMetricTypes;
        break;
      case 'awsRDS':
        myMetrics = awsRDSSnapshotMetricTypes;
        break;
      case 'awsS3':
        myMetrics = awsS3SnapshotMetricTypes;
        break;
      case 'awsSQS':
        myMetrics = awsSQSSnapshotMetricTypes;
        break;
      case 'host':
        myMetrics = hostSnapshotMetricTypes;
        break;
      case 'pod':
        myMetrics = podSnapshotMetricTypes;
        break;
      case 'container':
        myMetrics = containerSnapshotMetricTypes;
        break;
    }
    return myMetrics.map(toMetricOpt);
  }, [props.nodeType]);

  return (
    <>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="infraExpressionRowButton"
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={toggle}
            aria-label={i18n.translate('xpack.infra.metrics.alertFlyout.expandRowLabel', {
              defaultMessage: 'Expand row.',
            })}
          />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFlexGroup css={StyledExpressionRowCss}>
            <div css={StyledExpressionCss}>
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
              />
            </div>
            {!displayWarningThreshold && criticalThresholdExpression}
          </EuiFlexGroup>
          {displayWarningThreshold && (
            <>
              <EuiFlexGroup css={StyledExpressionRowCss}>
                {criticalThresholdExpression}
                <EuiHealth css={StyledHealthCss} color="danger">
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.criticalThreshold"
                    defaultMessage="Alert"
                  />
                </EuiHealth>
              </EuiFlexGroup>
              <EuiFlexGroup css={StyledExpressionRowCss}>
                {warningThresholdExpression}
                <EuiHealth css={StyledHealthCss} color="warning">
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.warningThreshold"
                    defaultMessage="Warning"
                  />
                </EuiHealth>
                <EuiButtonIcon
                  data-test-subj="infraExpressionRowButton"
                  aria-label={i18n.translate(
                    'xpack.infra.metrics.alertFlyout.removeWarningThreshold',
                    {
                      defaultMessage: 'Remove warningThreshold',
                    }
                  )}
                  iconSize="s"
                  color="text"
                  iconType="minusInCircleFilled"
                  onClick={toggleWarningThreshold}
                />
              </EuiFlexGroup>
            </>
          )}
          {!displayWarningThreshold && (
            <>
              {' '}
              <EuiSpacer size="xs" />
              <EuiFlexGroup css={StyledExpressionRowCss}>
                <EuiButtonEmpty
                  data-test-subj="infraExpressionRowAddWarningThresholdButton"
                  color="primary"
                  flush="left"
                  size="xs"
                  iconType="plusInCircleFilled"
                  onClick={toggleWarningThreshold}
                >
                  <FormattedMessage
                    id="xpack.infra.metrics.alertFlyout.addWarningThreshold"
                    defaultMessage="Add warning threshold"
                  />
                </EuiButtonEmpty>
              </EuiFlexGroup>
            </>
          )}
        </EuiFlexItem>
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="infraExpressionRowButton"
              aria-label={i18n.translate('xpack.infra.metrics.alertFlyout.removeCondition', {
                defaultMessage: 'Remove condition',
              })}
              color="danger"
              iconType="trash"
              onClick={() => remove(expressionId)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isExpanded ? (
        <div
          css={css`
            padding: 0 0 0 28px;
          `}
        >
          {children}
        </div>
      ) : null}
      <EuiSpacer size="s" />
    </>
  );
};

const ThresholdElement: React.FC<{
  updateComparator: (c?: string) => void;
  updateThreshold: (t?: number[]) => void;
  threshold: InventoryMetricConditions['threshold'];
  comparator: InventoryMetricConditions['comparator'];
  errors: IErrorObject;
  metric?: SnapshotMetricType;
}> = ({ updateComparator, updateThreshold, threshold, metric, comparator, errors }) => {
  return (
    <>
      <div css={StyledExpressionCss}>
        <ThresholdExpression
          thresholdComparator={convertToBuiltInComparators(comparator) || COMPARATORS.GREATER_THAN}
          threshold={threshold}
          onChangeSelectedThresholdComparator={updateComparator}
          onChangeSelectedThreshold={updateThreshold}
          errors={errors}
        />
      </div>
      {metric && (
        <div
          css={css`
            align-self: center;
          `}
        >
          <EuiText size="s">{metricUnit[metric]?.label || ''}</EuiText>
        </div>
      )}
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

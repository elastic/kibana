/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { ISearchSource } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewBase } from '@kbn/es-query';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { debounce } from 'lodash';
import {
  ForLastExpression,
  IErrorObject,
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import { TimeUnitChar } from '@kbn/observability-plugin/common/utils/formatters/duration';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { GenericAggType, RuleConditionChart } from '@kbn/observability-plugin/public';
import { Aggregators, QUERY_INVALID } from '../../../../common/alerting/metrics';
import { useMetricsDataViewContext } from '../../../containers/metrics_source';
import { MetricsExplorerGroupBy } from '../../../pages/metrics/metrics_explorer/components/group_by';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { MetricsExplorerOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import { AlertContextMeta, AlertParams, MetricExpression } from '../types';
import { ExpressionRow } from './expression_row';
const FILTER_TYPING_DEBOUNCE_MS = 500;
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

type Props = Omit<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch' | 'dataViews'
>;

const defaultExpression = {
  aggType: Aggregators.AVERAGE,
  comparator: COMPARATORS.GREATER_THAN,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as MetricExpression;
export { defaultExpression };

export const Expressions: React.FC<Props> = (props) => {
  const { setRuleParams, ruleParams, errors, metadata, onChangeMetaData } = props;
  const { services } = useKibanaContextForPlugin();
  const { data, dataViews, dataViewEditor } = services;
  const { metricsView } = useMetricsDataViewContext();

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnitChar | undefined>('m');

  const [dataView, setDataView] = useState<DataView>();
  const [searchSource, setSearchSource] = useState<ISearchSource>();
  const derivedIndexPattern = useMemo<DataViewBase>(
    () => ({
      fields: dataView?.fields || [],
      title: dataView?.getIndexPattern() || 'unknown-index',
    }),
    [dataView]
  );

  useEffect(() => {
    const initSearchSource = async () => {
      let initialSearchConfiguration = ruleParams.searchConfiguration;

      if (!ruleParams.searchConfiguration) {
        const newSearchSource = data.search.searchSource.createEmpty();
        newSearchSource.setField('query', data.query.queryString.getDefaultQuery());

        const metricsDataViewFromSettings = metricsView?.dataViewReference;

        const defaultDataView =
          metricsDataViewFromSettings ?? (await data.dataViews.getDefaultDataView());

        if (defaultDataView) {
          newSearchSource.setField('index', defaultDataView);
          setDataView(defaultDataView);
        }

        initialSearchConfiguration = newSearchSource.getSerializedFields();
      }

      try {
        const createdSearchSource = await data.search.searchSource.create(
          initialSearchConfiguration
        );
        setRuleParams('searchConfiguration', initialSearchConfiguration);
        setSearchSource(createdSearchSource);
        setDataView(createdSearchSource.getField('index'));
      } catch (error) {
        // TODO
      }
    };

    initSearchSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource, data.dataViews]);

  const options = useMemo<MetricsExplorerOptions>(() => {
    if (metadata?.currentOptions?.metrics) {
      return metadata.currentOptions as MetricsExplorerOptions;
    } else {
      return {
        metrics: [],
        aggregation: 'avg',
      };
    }
  }, [metadata]);

  const onSelectDataView = useCallback(
    (newDataView: DataView) => {
      const ruleCriteria = (ruleParams.criteria ? ruleParams.criteria.slice() : []).map(
        (criterion) => {
          criterion.customMetrics?.forEach((metric) => {
            metric.field = undefined;
          });
          return criterion;
        }
      );
      setRuleParams('criteria', ruleCriteria);
      searchSource?.setParent(undefined).setField('index', newDataView);
      setRuleParams('searchConfiguration', searchSource?.getSerializedFields());
      setDataView(newDataView);
    },
    [ruleParams.criteria, searchSource, setRuleParams]
  );

  const updateParams = useCallback(
    (id: any, e: MetricExpression) => {
      const ruleCriteria = ruleParams.criteria ? ruleParams.criteria.slice() : [];
      ruleCriteria[id] = e;
      setRuleParams('criteria', ruleCriteria);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const addExpression = useCallback(() => {
    const ruleCriteria = ruleParams.criteria?.slice() || [];
    ruleCriteria.push({
      ...defaultExpression,
      timeSize: timeSize ?? defaultExpression.timeSize,
      timeUnit: timeUnit ?? defaultExpression.timeUnit,
    });
    setRuleParams('criteria', ruleCriteria);
  }, [setRuleParams, ruleParams.criteria, timeSize, timeUnit]);

  const removeExpression = useCallback(
    (id: number) => {
      const ruleCriteria = ruleParams.criteria?.slice() || [];
      if (ruleCriteria.length > 1) {
        ruleCriteria.splice(id, 1);
        setRuleParams('criteria', ruleCriteria);
      }
    },
    [setRuleParams, ruleParams.criteria]
  );

  const onFilterChange = useCallback(
    (filter: any) => {
      setRuleParams('filterQueryText', filter);
      try {
        setRuleParams(
          'filterQuery',
          convertKueryToElasticSearchQuery(filter, dataView, false) || ''
        );
      } catch (e) {
        setRuleParams('filterQuery', QUERY_INVALID);
      }
    },
    [setRuleParams, dataView]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      setRuleParams('groupBy', group && group.length ? group : '');
    },
    [setRuleParams]
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
      const ruleCriteria =
        ruleParams.criteria?.map((c) => ({
          ...c,
          timeSize: ts,
        })) || [];
      setTimeSize(ts || undefined);
      setRuleParams('criteria', ruleCriteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const updateTimeUnit = useCallback(
    (tu: string) => {
      const ruleCriteria = (ruleParams.criteria?.map((c) => ({
        ...c,
        timeUnit: tu,
      })) || []) as AlertParams['criteria'];
      setTimeUnit(tu as TimeUnitChar);
      setRuleParams('criteria', ruleCriteria);
    },
    [ruleParams.criteria, setRuleParams]
  );

  const preFillAlertCriteria = useCallback(() => {
    const md = metadata;
    if (md?.currentOptions?.metrics?.length) {
      setRuleParams(
        'criteria',
        md.currentOptions.metrics.map((metric) => ({
          metric: metric.field,
          comparator: COMPARATORS.GREATER_THAN,
          threshold: [],
          timeSize,
          timeUnit,
          aggType: metric.aggregation,
        })) as AlertParams['criteria']
      );
    } else {
      setRuleParams('criteria', [defaultExpression]);
    }
  }, [metadata, setRuleParams, timeSize, timeUnit]);

  const preFillAlertFilter = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.filterQuery) {
      setRuleParams('filterQueryText', md.currentOptions.filterQuery);
      setRuleParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(md.currentOptions.filterQuery, dataView) || ''
      );
    } else if (md && md.currentOptions?.groupBy && md.series) {
      const { groupBy } = md.currentOptions;
      const filter = Array.isArray(groupBy)
        ? groupBy.map((field, index) => `${field}: "${md.series?.keys?.[index]}"`).join(' and ')
        : `${groupBy}: "${md.series.id}"`;
      setRuleParams('filterQueryText', filter);
      setRuleParams('filterQuery', convertKueryToElasticSearchQuery(filter, dataView) || '');
    }
  }, [metadata, dataView, setRuleParams]);

  const preFillAlertGroupBy = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.groupBy && !md.series) {
      setRuleParams('groupBy', md.currentOptions.groupBy);
    }
  }, [metadata, setRuleParams]);

  useEffect(() => {
    if (ruleParams.criteria && ruleParams.criteria.length) {
      setTimeSize(ruleParams.criteria[0].timeSize);
      setTimeUnit(ruleParams.criteria[0].timeUnit);
    } else {
      preFillAlertCriteria();
    }

    if (!ruleParams.filterQuery) {
      preFillAlertFilter();
    }

    if (!ruleParams.groupBy) {
      preFillAlertGroupBy();
    }

    if (!ruleParams.sourceId) {
      setRuleParams('sourceId', '');
    }

    if (typeof ruleParams.alertOnNoData === 'undefined') {
      setRuleParams('alertOnNoData', true);
    }
    if (typeof ruleParams.alertOnGroupDisappear === 'undefined') {
      setRuleParams('alertOnGroupDisappear', false);
    }
  }, [metadata]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

  const hasGroupBy = useMemo(
    () => ruleParams.groupBy && ruleParams.groupBy.length > 0,
    [ruleParams.groupBy]
  );

  const disableNoData = useMemo(
    () => ruleParams.criteria?.every((c) => c.aggType === Aggregators.COUNT),
    [ruleParams.criteria]
  );

  return (
    <>
      <DataViewSelectPopover
        dependencies={{ dataViews, dataViewEditor }}
        dataView={dataView}
        onSelectDataView={onSelectDataView}
        onChangeMetaData={({ adHocDataViewList }) => {
          onChangeMetaData({ ...metadata, adHocDataViewList });
        }}
      />
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <EuiSpacer size="xs" />
      {dataView &&
        ruleParams.criteria.map((e, idx) => {
          let metricExpression = [
            {
              aggType: e.aggType as GenericAggType,
              // RuleConditionChart uses A,B,C etc in its parser to identify multiple conditions
              name: String.fromCharCode('A'.charCodeAt(0) + idx),
              field: e.metric || '',
            },
          ];
          if (e.customMetrics) {
            metricExpression = e.customMetrics.map((metric) => ({
              name: metric.name,
              aggType: metric.aggType as GenericAggType,
              field: metric.field || '',
              filter: metric.filter,
            }));
          }
          return (
            <ExpressionRow
              canDelete={(ruleParams.criteria && ruleParams.criteria.length > 1) || false}
              fields={derivedIndexPattern.fields as any}
              remove={removeExpression}
              addExpression={addExpression}
              key={idx} // idx's don't usually make good key's but here the index has semantic meaning
              expressionId={idx}
              setRuleParams={updateParams}
              errors={(errors[idx] as IErrorObject) || emptyError}
              expression={e || {}}
            >
              <RuleConditionChart
                metricExpression={{
                  metrics: metricExpression,
                  threshold: e.threshold,
                  comparator: e.comparator,
                  timeSize,
                  timeUnit,
                  warningComparator: e.warningComparator,
                  warningThreshold: e.warningThreshold,
                }}
                searchConfiguration={{
                  index: dataView.id,
                  query: {
                    query: ruleParams.filterQueryText || '',
                    language: 'kuery',
                  },
                }}
                timeRange={{ from: `now-${(timeSize ?? 1) * 20}${timeUnit}`, to: 'now' }}
                error={(errors[idx] as IErrorObject) || emptyError}
                dataView={dataView}
                groupBy={ruleParams.groupBy}
              />
            </ExpressionRow>
          );
        })}

      <div style={{ marginLeft: 28 }}>
        <ForLastExpression
          timeWindowSize={timeSize}
          timeWindowUnit={timeUnit}
          errors={emptyError}
          onChangeWindowSize={updateTimeSize}
          onChangeWindowUnit={updateTimeUnit}
        />
      </div>

      <EuiSpacer size="m" />
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
      <EuiAccordion
        id="advanced-options-accordion"
        buttonContent={i18n.translate('xpack.infra.metrics.alertFlyout.advancedOptions', {
          defaultMessage: 'Advanced options',
        })}
      >
        <EuiPanel color="subdued">
          <EuiCheckbox
            disabled={disableNoData}
            id="metrics-alert-no-data-toggle"
            label={
              <>
                {i18n.translate('xpack.infra.metrics.alertFlyout.alertOnNoData', {
                  defaultMessage: "Alert me if there's no data",
                })}{' '}
                <EuiIconTip
                  type="questionInCircle"
                  color="subdued"
                  content={
                    (disableNoData ? `${docCountNoDataDisabledHelpText} ` : '') +
                    i18n.translate('xpack.infra.metrics.alertFlyout.noDataHelpText', {
                      defaultMessage:
                        'Enable this to trigger the action if the metric(s) do not report any data over the expected time period, or if the alert fails to query Elasticsearch',
                    })
                  }
                />
              </>
            }
            checked={ruleParams.alertOnNoData}
            onChange={(e) => setRuleParams('alertOnNoData', e.target.checked)}
          />
        </EuiPanel>
      </EuiAccordion>
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
        {(metadata && derivedIndexPattern && (
          <MetricsExplorerKueryBar
            onChange={debouncedOnFilterChange}
            onSubmit={onFilterChange}
            value={ruleParams.filterQueryText}
          />
        )) || (
          <EuiFieldSearch
            data-test-subj="infraExpressionsFieldSearch"
            onChange={handleFieldSearchChange}
            value={ruleParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerText', {
          defaultMessage: 'Group alerts by (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.createAlertPerHelpText', {
          defaultMessage:
            'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
        })}
        fullWidth
        display="rowCompressed"
      >
        <MetricsExplorerGroupBy
          onChange={onGroupByChange}
          fields={derivedIndexPattern.fields as any}
          options={{
            ...options,
            groupBy: ruleParams.groupBy || undefined,
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiCheckbox
        id="metrics-alert-group-disappear-toggle"
        label={
          <>
            {i18n.translate('xpack.infra.metrics.alertFlyout.alertOnGroupDisappear', {
              defaultMessage: 'Alert me if a group stops reporting data',
            })}{' '}
            <EuiIconTip
              type="questionInCircle"
              color="subdued"
              content={
                (disableNoData ? `${docCountNoDataDisabledHelpText} ` : '') +
                i18n.translate('xpack.infra.metrics.alertFlyout.groupDisappearHelpText', {
                  defaultMessage:
                    'Enable this to trigger the action if a previously detected group begins to report no results. This is not recommended for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                })
              }
            />
          </>
        }
        disabled={!hasGroupBy}
        checked={Boolean(ruleParams.alertOnGroupDisappear)}
        onChange={(e) => setRuleParams('alertOnGroupDisappear', e.target.checked)}
      />
      <EuiSpacer size="m" />
    </>
  );
};

const docCountNoDataDisabledHelpText = i18n.translate(
  'xpack.infra.metrics.alertFlyout.docCountNoDataDisabledHelpText',
  {
    defaultMessage: '[This setting is not applicable to the Document Count aggregator.]',
  }
);

// eslint-disable-next-line import/no-default-export
export default Expressions;

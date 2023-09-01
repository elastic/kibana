/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiEmptyPrompt,
  EuiFormErrorText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { ISearchSource, Query } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewBase } from '@kbn/es-query';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ForLastExpression,
  IErrorObject,
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';

import { useKibana } from '../../utils/kibana_react';
import { Aggregators, Comparator } from '../../../common/threshold_rule/types';
import { TimeUnitChar } from '../../../common/utils/formatters/duration';
import { AlertContextMeta, AlertParams, MetricExpression } from './types';
import { ExpressionChart } from './components/expression_chart';
import { ExpressionRow } from './components/expression_row';
import { MetricsExplorerGroupBy } from './components/group_by';
import { MetricsExplorerOptions } from './hooks/use_metrics_explorer_options';

const FILTER_TYPING_DEBOUNCE_MS = 500;

type Props = Omit<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch'
>;

export const defaultExpression = {
  aggType: Aggregators.CUSTOM,
  comparator: Comparator.GT,
  threshold: [],
  timeSize: 1,
  timeUnit: 'm',
} as MetricExpression;

// eslint-disable-next-line import/no-default-export
export default function Expressions(props: Props) {
  const { setRuleParams, ruleParams, errors, metadata, onChangeMetaData } = props;
  const {
    data,
    dataViews,
    dataViewEditor,
    docLinks,
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const [timeSize, setTimeSize] = useState<number | undefined>(1);
  const [timeUnit, setTimeUnit] = useState<TimeUnitChar | undefined>('m');
  const [dataView, setDataView] = useState<DataView>();
  const [dataViewTimeFieldError, setDataViewTimeFieldError] = useState<string>();
  const [searchSource, setSearchSource] = useState<ISearchSource>();
  const [paramsError, setParamsError] = useState<Error>();
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
        const defaultDataView = await data.dataViews.getDefaultDataView();
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

        if (createdSearchSource.getField('index')) {
          const timeFieldName = createdSearchSource.getField('index')?.timeFieldName;
          if (!timeFieldName) {
            setDataViewTimeFieldError(
              i18n.translate(
                'xpack.observability.threshold.rule.alertFlyout.dataViewError.noTimestamp',
                {
                  defaultMessage:
                    'The selected data view does not have a timestamp field, please select another data view.',
                }
              )
            );
          } else {
            setDataViewTimeFieldError(undefined);
          }
        } else {
          setDataViewTimeFieldError(undefined);
        }
      } catch (error) {
        setParamsError(error);
      }
    };

    initSearchSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.search.searchSource, data.dataViews, dataView]);

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
    (id, e: MetricExpression) => {
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
    ({ query }: { query?: Query }) => {
      setRuleParams('searchConfiguration', { ...ruleParams.searchConfiguration, query });
    },
    [setRuleParams, ruleParams.searchConfiguration]
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
          comparator: Comparator.GT,
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

    if (!ruleParams.groupBy) {
      preFillAlertGroupBy();
    }

    if (typeof ruleParams.alertOnNoData === 'undefined') {
      setRuleParams('alertOnNoData', true);
    }
    if (typeof ruleParams.alertOnGroupDisappear === 'undefined') {
      setRuleParams('alertOnGroupDisappear', true);
    }
  }, [metadata]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasGroupBy = useMemo(
    () => ruleParams.groupBy && ruleParams.groupBy.length > 0,
    [ruleParams.groupBy]
  );

  const disableNoData = useMemo(
    () => ruleParams.criteria?.every((c) => c.aggType === Aggregators.COUNT),
    [ruleParams.criteria]
  );

  // Test to see if any of the group fields in groupBy are already filtered down to a single
  // group by the filterQuery. If this is the case, then a groupBy is unnecessary, as it would only
  // ever produce one group instance
  const groupByFilterTestPatterns = useMemo(() => {
    if (!ruleParams.groupBy) return null;
    const groups = !Array.isArray(ruleParams.groupBy) ? [ruleParams.groupBy] : ruleParams.groupBy;
    return groups.map((group: string) => ({
      groupName: group,
      pattern: new RegExp(`{"match(_phrase)?":{"${group}":"(.*?)"}}`),
    }));
  }, [ruleParams.groupBy]);

  const redundantFilterGroupBy = useMemo(() => {
    const { filterQuery } = ruleParams;
    if (typeof filterQuery !== 'string' || !groupByFilterTestPatterns) return [];
    return groupByFilterTestPatterns
      .map(({ groupName, pattern }) => {
        if (pattern.test(filterQuery)) {
          return groupName;
        }
      })
      .filter((g) => typeof g === 'string') as string[];
  }, [ruleParams, groupByFilterTestPatterns]);

  if (paramsError) {
    return (
      <>
        <EuiCallOut color="danger" iconType="warning" data-test-subj="thresholdRuleExpressionError">
          <p>{paramsError.message}</p>
        </EuiCallOut>
        <EuiSpacer size={'m'} />
      </>
    );
  }

  if (!searchSource) {
    return (
      <>
        <EuiEmptyPrompt title={<EuiLoadingSpinner size="xl" />} />
        <EuiSpacer size="m" />
      </>
    );
  }

  const placeHolder = i18n.translate(
    'xpack.observability.threshold.rule.alertFlyout.searchBar.placeholder',
    {
      defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
    }
  );

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.observability.threshold.rule.alertFlyout.selectDataViewPrompt"
            defaultMessage="Select a data view"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DataViewSelectPopover
        dependencies={{ dataViews, dataViewEditor }}
        dataView={dataView}
        metadata={{ adHocDataViewList: metadata?.adHocDataViewList || [] }}
        onSelectDataView={onSelectDataView}
        onChangeMetaData={({ adHocDataViewList }) => {
          onChangeMetaData({ ...metadata, adHocDataViewList });
        }}
      />
      {dataViewTimeFieldError && (
        <EuiFormErrorText data-test-subj="thresholdRuleDataViewErrorNoTimestamp">
          {dataViewTimeFieldError}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.observability.threshold.rule.alertFlyout.defineTextQueryPrompt"
            defaultMessage="Define query filter (optional)"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SearchBar
        appName={i18n.translate(
          'xpack.observability.threshold.rule.alertFlyout.searchBar.appName',
          {
            defaultMessage: 'Threshold rule',
          }
        )}
        iconType="search"
        placeholder={placeHolder}
        indexPatterns={dataView ? [dataView] : undefined}
        showQueryInput={true}
        showQueryMenu={false}
        showFilterBar={false}
        showDatePicker={false}
        showSubmitButton={false}
        displayStyle="inPage"
        onQueryChange={debouncedOnFilterChange}
        onQuerySubmit={onFilterChange}
        dataTestSubj="thresholdRuleUnifiedSearchBar"
        query={ruleParams.searchConfiguration?.query as Query}
      />
      {errors.filterQuery && (
        <EuiFormErrorText data-test-subj="thresholdRuleDataViewErrorNoTimestamp">
          {errors.filterQuery}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.observability.threshold.rule.alertFlyout.setConditions"
            defaultMessage="Set rule conditions"
          />
        </h5>
      </EuiTitle>
      {ruleParams.criteria &&
        ruleParams.criteria.map((e, idx) => {
          return (
            <div key={idx}>
              {/* index has semantic meaning, we show the condition title starting from the 2nd one  */}
              {idx >= 1 && (
                <EuiTitle size="xs">
                  <h5>
                    <FormattedMessage
                      id="xpack.observability.threshold.rule.alertFlyout.condition"
                      defaultMessage="Condition {conditionNumber}"
                      values={{ conditionNumber: idx + 1 }}
                    />
                  </h5>
                </EuiTitle>
              )}
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
                dataView={derivedIndexPattern}
              >
                {/* Preview */}
                <ExpressionChart
                  expression={e}
                  derivedIndexPattern={derivedIndexPattern}
                  filterQuery={(ruleParams.searchConfiguration?.query as Query)?.query as string}
                  groupBy={ruleParams.groupBy}
                  timeFieldName={dataView?.timeFieldName}
                />
              </ExpressionRow>
            </div>
          );
        })}

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        errors={emptyError}
        onChangeWindowSize={updateTimeSize}
        onChangeWindowUnit={updateTimeUnit}
        display="fullWidth"
      />

      <EuiSpacer size="m" />
      <div>
        <EuiButtonEmpty
          data-test-subj="thresholdRuleExpressionsAddConditionButton"
          color="primary"
          iconSide="left"
          flush="left"
          iconType="plusInCircleFilled"
          onClick={addExpression}
        >
          <FormattedMessage
            id="xpack.observability.threshold.rule.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.observability.threshold.rule.alertFlyout.createAlertPerText', {
          defaultMessage: 'Group alerts by (optional)',
        })}
        helpText={i18n.translate(
          'xpack.observability.threshold.rule.alertFlyout.createAlertPerHelpText',
          {
            defaultMessage:
              'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
          }
        )}
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
          errorOptions={redundantFilterGroupBy}
        />
      </EuiFormRow>
      {redundantFilterGroupBy.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.observability.threshold.rule.alertFlyout.alertPerRedundantFilterError"
              defaultMessage="This rule may alert on {matchedGroups} less than expected, because the filter query contains a match for {groupCount, plural, one {this field} other {these fields}}. For more information, refer to {filteringAndGroupingLink}."
              values={{
                matchedGroups: <strong>{redundantFilterGroupBy.join(', ')}</strong>,
                groupCount: redundantFilterGroupBy.length,
                filteringAndGroupingLink: (
                  <EuiLink
                    data-test-subj="thresholdRuleExpressionsTheDocsLink"
                    href={`${docLinks.links.observability.metricsThreshold}#filtering-and-grouping`}
                  >
                    {i18n.translate(
                      'xpack.observability.threshold.rule.alertFlyout.alertPerRedundantFilterError.docsLink',
                      { defaultMessage: 'the docs' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiCheckbox
        id="metrics-alert-group-disappear-toggle"
        label={
          <>
            {i18n.translate(
              'xpack.observability.threshold.rule.alertFlyout.alertOnGroupDisappear',
              {
                defaultMessage: 'Alert me if a group stops reporting data',
              }
            )}{' '}
            <EuiToolTip
              content={
                (disableNoData ? `${docCountNoDataDisabledHelpText} ` : '') +
                i18n.translate(
                  'xpack.observability.threshold.rule.alertFlyout.groupDisappearHelpText',
                  {
                    defaultMessage:
                      'Enable this to trigger the action if a previously detected group begins to report no results. This is not recommended for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                  }
                )
              }
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </>
        }
        disabled={disableNoData || !hasGroupBy}
        checked={Boolean(hasGroupBy && ruleParams.alertOnGroupDisappear)}
        onChange={(e) => setRuleParams('alertOnGroupDisappear', e.target.checked)}
      />
      <EuiSpacer size="m" />
    </>
  );
}

const docCountNoDataDisabledHelpText = i18n.translate(
  'xpack.observability.threshold.rule.alertFlyout.docCountNoDataDisabledHelpText',
  {
    defaultMessage: '[This setting is not applicable to the Document Count aggregator.]',
  }
);

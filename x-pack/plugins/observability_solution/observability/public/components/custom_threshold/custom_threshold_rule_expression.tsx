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
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
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

import { COMPARATORS } from '@kbn/alerting-comparators';
import { useKibana } from '../../utils/kibana_react';
import { Aggregators } from '../../../common/custom_threshold_rule/types';
import { TimeUnitChar } from '../../../common/utils/formatters/duration';
import { AlertContextMeta, AlertParams, MetricExpression } from './types';
import { ExpressionRow } from './components/expression_row';
import { MetricsExplorerFields, GroupBy } from './components/group_by';
import { RuleConditionChart as PreviewChart } from '../rule_condition_chart/rule_condition_chart';
import { getSearchConfiguration } from './helpers/get_search_configuration';

const FILTER_TYPING_DEBOUNCE_MS = 500;

type Props = Omit<
  RuleTypeParamsExpressionProps<RuleTypeParams & AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch'
>;

export const defaultExpression: MetricExpression = {
  comparator: COMPARATORS.GREATER_THAN,
  metrics: [
    {
      name: 'A',
      aggType: Aggregators.COUNT,
    },
  ],
  threshold: [100],
  timeSize: 1,
  timeUnit: 'm',
};

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
  const [paramsWarning, setParamsWarning] = useState<string>();
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

      if (!ruleParams.searchConfiguration || !ruleParams.searchConfiguration.index) {
        if (metadata?.currentOptions?.searchConfiguration) {
          initialSearchConfiguration = {
            query: {
              query: ruleParams.searchConfiguration?.query ?? '',
              language: 'kuery',
            },
            ...metadata.currentOptions.searchConfiguration,
          };
        } else {
          const newSearchSource = data.search.searchSource.createEmpty();
          newSearchSource.setField('query', data.query.queryString.getDefaultQuery());
          const defaultDataView = await data.dataViews.getDefaultDataView();
          if (defaultDataView) {
            newSearchSource.setField('index', defaultDataView);
            setDataView(defaultDataView);
          }
          initialSearchConfiguration = getSearchConfiguration(
            newSearchSource.getSerializedFields(),
            setParamsWarning
          );
        }
      }

      try {
        const createdSearchSource = await data.search.searchSource.create(
          initialSearchConfiguration
        );
        setRuleParams(
          'searchConfiguration',
          getSearchConfiguration(
            {
              ...initialSearchConfiguration,
              ...(ruleParams.searchConfiguration?.query && {
                query: ruleParams.searchConfiguration.query,
              }),
            },
            setParamsWarning
          )
        );
        setSearchSource(createdSearchSource);
        setDataView(createdSearchSource.getField('index'));

        if (createdSearchSource.getField('index')) {
          const timeFieldName = createdSearchSource.getField('index')?.timeFieldName;
          if (!timeFieldName) {
            setDataViewTimeFieldError(
              i18n.translate(
                'xpack.observability.customThreshold.rule.alertFlyout.dataViewError.noTimestamp',
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

  useEffect(() => {
    if (ruleParams.criteria && ruleParams.criteria.length) {
      setTimeSize(ruleParams.criteria[0].timeSize);
      setTimeUnit(ruleParams.criteria[0].timeUnit);
    } else {
      preFillCriteria();
    }

    if (!ruleParams.groupBy) {
      preFillGroupBy();
    }

    if (typeof ruleParams.alertOnNoData === 'undefined') {
      setRuleParams('alertOnNoData', true);
    }
    if (typeof ruleParams.alertOnGroupDisappear === 'undefined') {
      preFillAlertOnGroupDisappear();
    }
  }, [metadata]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelectDataView = useCallback(
    (newDataView: DataView) => {
      const ruleCriteria = (ruleParams.criteria ? ruleParams.criteria.slice() : []).map(
        (criterion) => {
          criterion.metrics?.forEach((metric) => {
            metric.field = undefined;
          });
          return criterion;
        }
      );
      setRuleParams('criteria', ruleCriteria);
      searchSource?.setParent(undefined).setField('index', newDataView);
      setRuleParams(
        'searchConfiguration',
        searchSource && getSearchConfiguration(searchSource.getSerializedFields(), setParamsWarning)
      );
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
      const ruleCriteria = ruleParams.criteria?.filter((_, index) => index !== id) || [];
      setRuleParams('criteria', ruleCriteria);
    },
    [setRuleParams, ruleParams.criteria]
  );

  const onFilterChange = useCallback(
    ({ query }: { query?: Query }) => {
      setParamsWarning(undefined);
      setRuleParams(
        'searchConfiguration',
        getSearchConfiguration({ ...ruleParams.searchConfiguration, query }, setParamsWarning)
      );
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

  const preFillCriteria = useCallback(() => {
    const md = metadata;
    if (md?.currentOptions?.criteria?.length) {
      const { timeSize: prefillTimeSize, timeUnit: prefillTimeUnit } =
        md.currentOptions.criteria[0];
      if (prefillTimeSize) setTimeSize(prefillTimeSize);
      if (prefillTimeUnit) setTimeUnit(prefillTimeUnit);
      setRuleParams(
        'criteria',
        md.currentOptions.criteria.map((criterion) => ({
          ...defaultExpression,
          ...criterion,
        }))
      );
    } else {
      setRuleParams('criteria', [defaultExpression]);
    }
  }, [metadata, setRuleParams]);

  const preFillGroupBy = useCallback(() => {
    const md = metadata;
    if (md && md.currentOptions?.groupBy) {
      setRuleParams('groupBy', md.currentOptions.groupBy);
    }
  }, [metadata, setRuleParams]);

  const preFillAlertOnGroupDisappear = useCallback(() => {
    const md = metadata;
    if (md && typeof md.currentOptions?.alertOnGroupDisappear !== 'undefined') {
      setRuleParams('alertOnGroupDisappear', md.currentOptions.alertOnGroupDisappear);
    } else {
      setRuleParams('alertOnGroupDisappear', true);
    }
  }, [metadata, setRuleParams]);

  const hasGroupBy = useMemo(
    () => ruleParams.groupBy && ruleParams.groupBy.length > 0,
    [ruleParams.groupBy]
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
    'xpack.observability.customThreshold.rule.alertFlyout.searchBar.placeholder',
    {
      defaultMessage: 'Search for observability data… (e.g. host.name:host-1)',
    }
  );
  return (
    <>
      {!!paramsWarning && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.observability.customThreshold.rule.alertFlyout.warning.title',
              {
                defaultMessage: 'Warning',
              }
            )}
            color="warning"
            iconType="warning"
            data-test-subj="thresholdRuleExpressionWarning"
          >
            {paramsWarning}
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.observability.customThreshold.rule.alertFlyout.selectDataViewPrompt"
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
            id="xpack.observability.customThreshold.rule.alertFlyout.defineTextQueryPrompt"
            defaultMessage="Define query filter (optional)"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <SearchBar
        appName="Custom threshold rule"
        iconType="search"
        placeholder={placeHolder}
        indexPatterns={dataView ? [dataView] : undefined}
        showQueryInput={true}
        showQueryMenu={false}
        showFilterBar={!!ruleParams.searchConfiguration?.filter}
        showDatePicker={false}
        showSubmitButton={false}
        displayStyle="inPage"
        onQueryChange={debouncedOnFilterChange}
        onQuerySubmit={onFilterChange}
        dataTestSubj="thresholdRuleUnifiedSearchBar"
        query={ruleParams.searchConfiguration?.query}
        filters={ruleParams.searchConfiguration?.filter}
        onFiltersUpdated={(filter) => {
          setRuleParams(
            'searchConfiguration',
            getSearchConfiguration(
              {
                ...ruleParams.searchConfiguration,
                filter,
              },
              setParamsWarning
            )
          );
        }}
      />
      {errors.filterQuery && (
        <EuiFormErrorText data-test-subj="thresholdRuleDataViewErrorNoTimestamp">
          {errors.filterQuery}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="l" />
      {ruleParams.criteria &&
        ruleParams.criteria.map((e, idx) => {
          return (
            <div key={idx}>
              {idx > 0 && <EuiHorizontalRule margin="s" />}
              <ExpressionRow
                canDelete={(ruleParams.criteria && ruleParams.criteria.length > 1) || false}
                fields={derivedIndexPattern.fields}
                remove={removeExpression}
                addExpression={addExpression}
                key={idx} // idx's don't usually make good key's but here the index has semantic meaning
                expressionId={idx}
                setRuleParams={updateParams}
                errors={(errors[idx] as IErrorObject) || emptyError}
                expression={e || {}}
                dataView={derivedIndexPattern}
                title={
                  ruleParams.criteria.length === 1 ? (
                    <FormattedMessage
                      id="xpack.observability.customThreshold.rule.alertFlyout.setConditions"
                      defaultMessage="Set rule conditions"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.observability.customThreshold.rule.alertFlyout.condition"
                      defaultMessage="Condition {conditionNumber}"
                      values={{ conditionNumber: idx + 1 }}
                    />
                  )
                }
              >
                <PreviewChart
                  metricExpression={e}
                  dataView={dataView}
                  searchConfiguration={ruleParams.searchConfiguration}
                  groupBy={ruleParams.groupBy}
                  error={(errors[idx] as IErrorObject) || emptyError}
                  timeRange={{ from: `now-${(timeSize ?? 1) * 20}${timeUnit}`, to: 'now' }}
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
            id="xpack.observability.customThreshold.rule.alertFlyout.addCondition"
            defaultMessage="Add condition"
          />
        </EuiButtonEmpty>
      </div>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.createAlertPerText',
          {
            defaultMessage: 'Group alerts by (optional)',
          }
        )}
        helpText={i18n.translate(
          'xpack.observability.customThreshold.rule.alertFlyout.createAlertPerHelpText',
          {
            defaultMessage:
              'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
          }
        )}
        fullWidth
        display="rowCompressed"
      >
        <GroupBy
          onChange={onGroupByChange}
          fields={derivedIndexPattern.fields as MetricsExplorerFields}
          options={{
            groupBy: ruleParams.groupBy || null,
          }}
          errorOptions={redundantFilterGroupBy}
        />
      </EuiFormRow>
      {redundantFilterGroupBy.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.observability.customThreshold.rule.alertFlyout.alertPerRedundantFilterError"
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
                      'xpack.observability.customThreshold.rule.alertFlyout.alertPerRedundantFilterError.docsLink',
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
              'xpack.observability.customThreshold.rule.alertFlyout.alertOnGroupDisappear',
              {
                defaultMessage: 'Alert me if a group stops reporting data',
              }
            )}{' '}
            <EuiIconTip
              type="questionInCircle"
              color="subdued"
              content={i18n.translate(
                'xpack.observability.customThreshold.rule.alertFlyout.groupDisappearHelpText',
                {
                  defaultMessage:
                    'Enable this to trigger the action if a previously detected group begins to report no results. This is not recommended for dynamically scaling infrastructures that may rapidly start and stop nodes automatically.',
                }
              )}
            />
          </>
        }
        disabled={!hasGroupBy}
        checked={Boolean(hasGroupBy && ruleParams.alertOnGroupDisappear)}
        onChange={(e) => setRuleParams('alertOnGroupDisappear', e.target.checked)}
      />
      <EuiSpacer size="m" />
    </>
  );
}
